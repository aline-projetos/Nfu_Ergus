package httpapi

import (
	"log"
	"net/http"
	"time"

	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		next.ServeHTTP(w, r)

		log.Printf(
			"%s %s %s %v",
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
			time.Since(start),
		)
	})
}

// Autenticação de usuarios
type AuthenticatedUser struct {
	ID           string
	TenantID     *string
	IsSuperAdmin bool
	UserType     string
}

func extractTokenFromHeader(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("Authorization header ausente")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", fmt.Errorf("formato do Authorization inválido")
	}

	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", fmt.Errorf("token vazio")
	}

	return token, nil
}

func AuthenticateRequest(db *sql.DB, r *http.Request) (*AuthenticatedUser, error) {
	token, err := extractTokenFromHeader(r)
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`
		SELECT
			s.token_hash,
			u.id,
			u.tenant_id,
			u.is_super_admin,
			u.type
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.expires_at > NOW()
		  AND s.revoked_at IS NULL
		  AND u.ativo = TRUE
	`)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar sessões: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			tokenHash string
			userID    string
			tenantRaw *uuid.UUID
			isSuper   bool
			userType  string
		)

		if err := rows.Scan(
			&tokenHash,
			&userID,
			&tenantRaw,
			&isSuper,
			&userType,
		); err != nil {
			return nil, fmt.Errorf("erro ao ler sessão: %w", err)
		}

		if bcrypt.CompareHashAndPassword([]byte(tokenHash), []byte(token)) == nil {
			var tenantID *string
			if tenantRaw != nil {
				s := tenantRaw.String()
				tenantID = &s
			}

			return &AuthenticatedUser{
				ID:           userID,
				TenantID:     tenantID,
				IsSuperAdmin: isSuper,
				UserType:     userType,
			}, nil
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erro ao iterar sessões: %w", err)
	}

	return nil, fmt.Errorf("token inválido ou expirado")
}

func resolveTenantID(r *http.Request, authUser *AuthenticatedUser) (string, error) {
	if !authUser.IsSuperAdmin {
		if authUser.TenantID == nil || strings.TrimSpace(*authUser.TenantID) == "" {
			return "", fmt.Errorf("usuário não possui tenant associado")
		}
		return *authUser.TenantID, nil
	}

	tenantID := r.Header.Get("X-Tenant-ID")
	if strings.TrimSpace(tenantID) == "" {
		return "", fmt.Errorf("X-Tenant-ID é obrigatório para super admin")
	}
	if _, err := uuid.Parse(tenantID); err != nil {
		return "", fmt.Errorf("X-Tenant-ID inválido")
	}
	return tenantID, nil
}

func GetTenantIDFromHeader(r *http.Request) (string, error) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if strings.TrimSpace(tenantID) == "" {
		return "", fmt.Errorf("X-Tenant-ID é obrigatório")
	}
	// valida se é UUID
	if _, err := uuid.Parse(tenantID); err != nil {
		return "", fmt.Errorf("X-Tenant-ID inválido")
	}
	return tenantID, nil
}

func RequireSession(db *sql.DB, r *http.Request) (*AuthenticatedUser, error) {
	return AuthenticateRequest(db, r)
}
