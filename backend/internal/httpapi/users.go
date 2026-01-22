package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// -----------------------------------------------------------------------------
// MODELOS
// -----------------------------------------------------------------------------

// User é o que sai para o frontend (não expõe password_hash nem token_hash)
type User struct {
	ID           string    `json:"id"`
	TenantID     *string   `json:"tenantId,omitempty"`
	Codigo       *int      `json:"codigo,omitempty"`
	Username     string    `json:"username"`
	UserEmail    string    `json:"useremail"`
	Type         string    `json:"type"`
	IsSuperAdmin bool      `json:"isSuperAdmin"`
	Ativo        bool      `json:"ativo"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type UserWithPassword struct {
	User
	Password string `json:"password"`
}

// UserInput é o payload de criação
type UserInput struct {
	TenantID  *string `json:"tenantId"`        // opcional (usuário global)
	Username  string  `json:"username"`        // obrigatório
	UserEmail string  `json:"useremail"`       // obrigatório
	Type      string  `json:"type"`            // obrigatório
	Ativo     *bool   `json:"ativo,omitempty"` // opcional
}

// UserUpdateInput é o payload de edição
type UserUpdateInput struct {
	TenantID  *string `json:"tenantId"`        // opcional (se quiser permitir mudar de tenant)
	Username  string  `json:"username"`        // obrigatório
	UserEmail string  `json:"useremail"`       // obrigatório
	Type      string  `json:"type"`            // obrigatório
	Ativo     *bool   `json:"ativo,omitempty"` // opcional
}

type UserHandler struct {
	DB *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{DB: db}
}

func (h *UserHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/users", h.handleUsers)
	mux.HandleFunc("/users/", h.handleUserByID)
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

// gera hash de senha com bcrypt
func hashPassword(plain string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

// gera um token aleatório + hash desse token (para salvar no banco)
func generateTokenAndHash() (plainToken string, tokenHash string, err error) {
	// 32 bytes -> 64 hex chars
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	plainToken = hex.EncodeToString(buf)

	h, err := bcrypt.GenerateFromPassword([]byte(plainToken), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}
	tokenHash = string(h)
	return plainToken, tokenHash, nil
}

// gera próximo código sequencial por tenant usando tenant_user_sequences
func (h *UserHandler) generateNextUserCode(tenantID uuid.UUID) (int, error) {
	var codigo int

	err := h.DB.QueryRow(`
		INSERT INTO tenant_user_sequences (tenant_id, next_codigo)
		VALUES ($1, 1)
		ON CONFLICT (tenant_id)
		DO UPDATE SET next_codigo = tenant_user_sequences.next_codigo + 1
		RETURNING next_codigo;
	`, tenantID).Scan(&codigo)

	if err != nil {
		return 0, fmt.Errorf("erro ao gerar próximo código de usuário: %w", err)
	}

	return codigo, nil
}

// valida entrada de edição
func validateUserCreateInput(in *UserInput) (tenantUUID *uuid.UUID, username, useremail, userType string, ativo bool, errMsg string) {
	// username obrigatório
	username = strings.TrimSpace(in.Username)
	if username == "" {
		return nil, "", "", "", false, "username é obrigatório"
	}
	// useremail obrigatório
	useremail = strings.TrimSpace(in.UserEmail)
	if useremail == "" {
		return nil, "", "", "", false, "email é obrigatório"
	}

	// type obrigatório
	userType = strings.TrimSpace(in.Type)
	if userType == "" {
		return nil, "", "", "", false, "type é obrigatório"
	}

	// tenantId obrigatório
	if in.TenantID == nil || strings.TrimSpace(*in.TenantID) == "" {
		return nil, "", "", "", false, "tenantId é obrigatório"
	}

	// valida UUID do tenant
	id, err := uuid.Parse(strings.TrimSpace(*in.TenantID))
	if err != nil {
		return nil, "", "", "", false, "tenantId inválido"
	}
	tenantUUID = &id

	// ativo default true
	ativo = true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	return tenantUUID, username, useremail, userType, ativo, ""
}

// -----------------------------------------------------------------------------
// HANDLERS ROOT /users
// -----------------------------------------------------------------------------

func (h *UserHandler) handleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateUser(w, r)
	case http.MethodGet:
		h.ListUsers(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// HANDLERS /users/{id}
// -----------------------------------------------------------------------------

func (h *UserHandler) handleUserByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/users/")
	if path == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	// pode ser "id" ou "id/reset-password"
	parts := strings.Split(path, "/")
	id := parts[0]

	if _, err := uuid.Parse(id); err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	// rota extra: /users/{id}/reset-password
	if len(parts) == 2 && parts[1] == "reset-password" {
		if r.Method == http.MethodPost {
			h.ResetUserPassword(w, r, id)
			return
		}
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetUserByID(w, r, id)
	case http.MethodPut:
		h.UpdateUser(w, r, id)
	case http.MethodDelete:
		h.DeleteUser(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// POST /users  (criar usuário)
// -----------------------------------------------------------------------------

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var in UserInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	tenantUUID, username, useremail, userType, ativo, errMsg := validateUserCreateInput(&in)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}
	// daqui pra frente sabemos que tenantUUID != nil

	// 1) gera senha aleatória + hash
	password, err := generatePassword()
	if err != nil {
		http.Error(w, "erro ao gerar senha: "+err.Error(), http.StatusInternalServerError)
		return
	}

	passwordHash, err := hashPassword(password)
	if err != nil {
		http.Error(w, "erro ao gerar hash da senha: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2) gera token + hash
	_, tokenHash, err := generateTokenAndHash()
	if err != nil {
		http.Error(w, "erro ao gerar token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3) gera próximo código do usuário para esse tenant
	codigo, err := h.generateNextUserCode(*tenantUUID)
	if err != nil {
		http.Error(w, "erro ao gerar código do usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 4) insere no banco
	var u User
	var tenantIDFromDB uuid.UUID

	err = h.DB.QueryRow(`
		INSERT INTO users (
			tenant_id,
			codigo,
			username,
			password_hash,
			type,
			is_super_admin,
			token_hash,
			ativo,
			useremail
		)
		VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8)
		RETURNING
			id,
			tenant_id,
			codigo,
			username,
			type,
			is_super_admin,
			ativo,
			created_at,
			updated_at,
			useremail
	`,
		*tenantUUID,  // $1
		codigo,       // $2
		username,     // $3
		passwordHash, // $4
		userType,     // $5
		tokenHash,    // $6
		ativo,        // $7
		useremail,    // $8
	).Scan(
		&u.ID,
		&tenantIDFromDB,
		&u.Codigo,
		&u.Username,
		&u.Type,
		&u.IsSuperAdmin,
		&u.Ativo,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.UserEmail,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			// violação de unique (username)
			http.Error(w, "já existe um usuário com esse username", http.StatusConflict)
			return
		}
		http.Error(w, "erro ao criar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// monta TenantID no struct de resposta
	idStr := tenantIDFromDB.String()
	u.TenantID = &idStr

	respBody := UserWithPassword{
		User:     u,
		Password: password,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(respBody)
}

// -----------------------------------------------------------------------------
// GET /users (lista, sem super admin)
// -----------------------------------------------------------------------------

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT
			id,
			tenant_id,
			codigo,
			username,
			type,
			is_super_admin,
			ativo,
			created_at,
			updated_at,
			useremail
		FROM users
		WHERE is_super_admin = FALSE
		ORDER BY username ASC
	`)
	if err != nil {
		http.Error(w, "erro ao listar usuários: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := make([]User, 0)

	for rows.Next() {
		var u User
		var tenantIDNullable *uuid.UUID

		if err := rows.Scan(
			&u.ID,
			&tenantIDNullable,
			&u.Codigo,
			&u.Username,
			&u.Type,
			&u.IsSuperAdmin,
			&u.Ativo,
			&u.CreatedAt,
			&u.UpdatedAt,
			&u.UserEmail,
		); err != nil {
			http.Error(w, "erro ao ler usuários: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if tenantIDNullable != nil {
			idStr := tenantIDNullable.String()
			u.TenantID = &idStr
		}

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar usuários: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(users)
}

// -----------------------------------------------------------------------------
// GET /users/{id} (sem super admin)
// -----------------------------------------------------------------------------

func (h *UserHandler) GetUserByID(w http.ResponseWriter, r *http.Request, id string) {
	var u User
	var tenantIDNullable *uuid.UUID

	err := h.DB.QueryRow(`
		SELECT
			id,
			tenant_id,
			codigo,
			username,
			type,
			is_super_admin,
			ativo,
			created_at,
			updated_at,
			useremail
		FROM users
		WHERE id = $1
		  AND is_super_admin = FALSE
	`,
		id,
	).Scan(
		&u.ID,
		&tenantIDNullable,
		&u.Codigo,
		&u.Username,
		&u.Type,
		&u.IsSuperAdmin,
		&u.Ativo,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.UserEmail,
	)

	if tenantIDNullable != nil {
		idStr := tenantIDNullable.String()
		u.TenantID = &idStr
	}

	if err == sql.ErrNoRows {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

// -----------------------------------------------------------------------------
// PUT /users/{id}
// -----------------------------------------------------------------------------

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	var in UserInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	tenantUUID, username, useremail, userType, ativo, errMsg := validateUserCreateInput(&in)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	// Primeiro buscamos para garantir que não é super_admin
	var isSuper bool
	err := h.DB.QueryRow(`SELECT is_super_admin FROM users WHERE id = $1`, id).Scan(&isSuper)
	if err == sql.ErrNoRows {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if isSuper {
		http.Error(w, "não é permitido alterar o super administrador", http.StatusForbidden)
		return
	}

	// Monta SQL dinâmico dependendo se veio password e/ou tenant/ativo
	query := `
		UPDATE users
		   SET username   = $1,
		       type       = $2,
			   useremail  = $3,
		       updated_at = NOW()`
	args := []any{username, userType, useremail}
	argPos := 4

	if tenantUUID != nil {
		query += `, tenant_id = $` + fmt.Sprint('0'+argPos)
		args = append(args, *tenantUUID)
		argPos++
	}

	if ativo {
		query += `, ativo = $` + fmt.Sprint('0'+argPos)
		args = append(args, ativo)
		argPos++
	}

	query += ` WHERE id = $` + fmt.Sprint('0'+argPos) + ` RETURNING
			id,
			tenant_id,
			codigo,
			username,
			type,
			is_super_admin,
			ativo,
			created_at,
			updated_at,
			useremail
	`

	args = append(args, id)

	var u User
	var tenantIDNullable *uuid.UUID

	err = h.DB.QueryRow(query, args...).Scan(
		&u.ID,
		&tenantIDNullable,
		&u.Codigo,
		&u.Username,
		&u.Type,
		&u.IsSuperAdmin,
		&u.Ativo,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.UserEmail,
	)
	if tenantIDNullable != nil {
		idStr := tenantIDNullable.String()
		u.TenantID = &idStr
	}

	if err == sql.ErrNoRows {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "já existe um usuário com esse username", http.StatusConflict)
			return
		}
		http.Error(w, "erro ao atualizar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

// -----------------------------------------------------------------------------
// DELETE /users/{id}  (soft delete: ativo = false)
// -----------------------------------------------------------------------------

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request, id string) {
	// não deixa desativar super admin
	res, err := h.DB.Exec(`
		UPDATE users
		   SET ativo      = FALSE,
		       updated_at = NOW()
		 WHERE id = $1
		   AND is_super_admin = FALSE
	`, id)
	if err != nil {
		http.Error(w, "erro ao inativar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "usuário não encontrado ou é super administrador", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// gera uma senha aleatória (base64 url-safe)
func generatePassword() (string, error) {
	b := make([]byte, 8) // 256 bits
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b), nil
}

func (h *UserHandler) ResetUserPassword(w http.ResponseWriter, r *http.Request, id string) {
	// garante que usuário existe e não é super admin
	var isSuper bool
	err := h.DB.QueryRow(`SELECT is_super_admin FROM users WHERE id = $1`, id).Scan(&isSuper)
	if err == sql.ErrNoRows {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if isSuper {
		http.Error(w, "não é permitido resetar senha do super administrador", http.StatusForbidden)
		return
	}

	// gera nova senha
	password, err := generatePassword()
	if err != nil {
		http.Error(w, "erro ao gerar nova senha: "+err.Error(), http.StatusInternalServerError)
		return
	}

	passwordHash, err := hashPassword(password)
	if err != nil {
		http.Error(w, "erro ao gerar hash da nova senha: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// atualiza hash no banco e retorna o usuário
	var u User
	var tenantIDNullable *uuid.UUID

	err = h.DB.QueryRow(`
		UPDATE users
		   SET password_hash = $1,
		       updated_at    = NOW()
		 WHERE id = $2
		 RETURNING
			id,
			tenant_id,
			codigo,
			username,
			type,
			is_super_admin,
			ativo,
			created_at,
			updated_at,
			useremail
	`,
		passwordHash,
		id,
	).Scan(
		&u.ID,
		&tenantIDNullable,
		&u.Codigo,
		&u.Username,
		&u.Type,
		&u.IsSuperAdmin,
		&u.Ativo,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.UserEmail,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "usuário não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao atualizar senha do usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if tenantIDNullable != nil {
		idStr := tenantIDNullable.String()
		u.TenantID = &idStr
	}

	resp := UserWithPassword{
		User:     u,
		Password: password,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
