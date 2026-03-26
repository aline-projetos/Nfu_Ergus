package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

/*
============================================================
ACCESS CONTROL - HANDLER
============================================================
Este handler é responsável pelas operações relacionadas
a controle de acesso.

No MVP:
- Permissões são FIXAS (seedadas via migration)
- Empresas NÃO podem criar/editar permissões
- Apenas listagem é exposta
============================================================
*/

type AccessControlHandler struct {
	DB *sql.DB
}

func NewAccessControlHandler(db *sql.DB) *AccessControlHandler {
	return &AccessControlHandler{DB: db}
}

/*
============================================================
MODEL - AccessPermission
============================================================
Representa a tabela access_permissions
*/
type AccessPermission struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`        // identificador técnico (ex: catalog.products.view)
	Name        string    `json:"name"`        // nome amigável
	Module      string    `json:"module"`      // módulo do sistema (catalog, fiscal, etc.)
	Description string    `json:"description"` // descrição opcional
	IsActive    bool      `json:"is_active"`   // se está ativa
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

/*
============================================================
GET /access/permissions
============================================================
Lista todas as permissões cadastradas no sistema.

Regra:
- Permissões são globais (não dependem de tenant)
- Apenas usuários autenticados podem listar
- No MVP, é apenas leitura
============================================================
*/
func (h *AccessControlHandler) ListAccessPermissions(w http.ResponseWriter, r *http.Request) {

	// 1) Validação de sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) Consulta no banco
	rows, err := h.DB.Query(`
		SELECT
			id,
			code,
			module,
			name,
			COALESCE(description, ''),
			is_active,
			created_at,
			updated_at
		FROM access_permissions
		ORDER BY module ASC, code ASC
	`)
	if err != nil {
		http.Error(w, "erro ao listar permissões de acesso", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// 3) Montagem da resposta
	var permissions []AccessPermission

	for rows.Next() {
		var p AccessPermission

		if err := rows.Scan(
			&p.ID,
			&p.Code,
			&p.Module,
			&p.Name,
			&p.Description,
			&p.IsActive,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			http.Error(w, "erro ao ler permissões de acesso", http.StatusInternalServerError)
			return
		}

		permissions = append(permissions, p)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar permissões de acesso", http.StatusInternalServerError)
		return
	}

	// 4) Retorno JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(permissions)
}
