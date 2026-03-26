package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

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

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string        `json:"token"`
	User  LoginUserInfo `json:"user"`
}

type LoginUserInfo struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	IsSuperAdmin bool   `json:"isSuperAdmin"`
	UserType     string `json:"type"`
	TenantID     string `json:"tenantId,omitempty"`
}

const sessionDuration = 8 * time.Hour

// Login godoc
// @Summary     Login do usuário
// @Description Autentica o usuário e retorna um token de sessão
// @Tags        Auth
// @Accept      json
// @Produce     json
// @Param       body body LoginRequest true "Credenciais de login"
// @Success     200 {object} LoginResponse
// @Failure     400 {string} string "JSON inválido ou campos obrigatórios"
// @Failure     401 {string} string "Usuário ou senha inválidos"
// @Failure     405 {string} string "Método não permitido"
// @Failure     500 {string} string "Erro interno ao autenticar"
// @Router      /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	defer r.Body.Close()

	var req LoginRequest
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
		tenantID     sql.NullString
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

	tokenHashBytes, err := bcrypt.GenerateFromPassword([]byte(sessionToken), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "erro ao gerar hash do token de sessão", http.StatusInternalServerError)
		return
	}

	tokenHash := string(tokenHashBytes)
	expiresAt := time.Now().Add(sessionDuration)
	var ip string
	host, _, splitErr := net.SplitHostPort(r.RemoteAddr)
	if splitErr == nil {
		ip = host
	} else {
		ip = r.RemoteAddr // fallback
	}
	_, err = h.DB.Exec(`
		INSERT INTO sessions (
			user_id,
			token_hash,
			expires_at,
			user_agent,
			ip_address
		)
		VALUES ($1, $2, $3, $4, $5)
	`,
		id,
		tokenHash,
		expiresAt,
		r.UserAgent(),
		ip,
	)
	if err != nil {
		http.Error(w, "erro ao criar sessão: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := LoginResponse{
		Token: sessionToken,
		User: LoginUserInfo{
			ID:           id,
			Email:        dbEmail.String,
			Name:         username,
			IsSuperAdmin: isSuperAdmin,
			UserType:     userType,
			TenantID: func() string {
				if tenantID.Valid {
					return tenantID.String
				}
				return ""
			}(),
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
