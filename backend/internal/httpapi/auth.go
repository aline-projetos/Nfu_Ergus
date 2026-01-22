package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

func (h *AuthHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/auth/login", h.Login)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string        `json:"token"`
	User  loginUserInfo `json:"user"`
}

type loginUserInfo struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	IsSuperAdmin bool   `json:"isSuperAdmin"`
	UserType     string `json:"type"`
	TenantID     string `json:"tenantId,omitempty"`
}

// POST /auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	defer r.Body.Close()

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(req.Email)
	password := strings.TrimSpace(req.Password)

	if email == "" || password == "" {
		http.Error(w, "email e senha são obrigatórios", http.StatusBadRequest)
		return
	}

	var (
		id           string
		dbEmail      sql.NullString
		username     string
		passwordHash string
		isSuperAdmin bool
		userType     string
		tenantID     string
	)

	err := h.DB.QueryRow(`
		SELECT
			id,
			useremail,
			username,
			password_hash,
			is_super_admin,
			type,
			tenant_id
		FROM users
		WHERE LOWER(useremail) = LOWER($1)
		  AND ativo = TRUE
	`, email).Scan(
		&id,
		&dbEmail,
		&username,
		&passwordHash,
		&isSuperAdmin,
		&userType,
		&tenantID,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "usuário ou senha inválidos", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar usuário: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// valida senha com bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		http.Error(w, "usuário ou senha inválidos", http.StatusUnauthorized)
		return
	}

	// gera token de sessão (opaco, aleatório)
	sessionToken, err := generateSessionToken()
	if err != nil {
		http.Error(w, "erro ao gerar token de sessão", http.StatusInternalServerError)
		return
	}

	resp := loginResponse{
		Token: sessionToken,
		User: loginUserInfo{
			ID:           id,
			Email:        dbEmail.String,
			Name:         username,
			IsSuperAdmin: isSuperAdmin,
			UserType:     userType,
			TenantID:     tenantID,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// gera um token randômico base64 pra sessão
func generateSessionToken() (string, error) {
	b := make([]byte, 32) // 256 bits
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b), nil
}
