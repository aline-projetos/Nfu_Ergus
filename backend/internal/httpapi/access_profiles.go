package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// ============================================================================
// MODELOS
// ============================================================================

type AccessProfile struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	Code          string    `json:"code"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	IsDefault     bool      `json:"is_default"`
	PermissionIDs []string  `json:"permissionIds"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateAccessProfileInput struct {
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	Description   *string  `json:"description"`
	IsDefault     *bool    `json:"is_default"` // se nil, assume false
	PermissionIDs []string `json:"permissionIds"`
}

type UpdateAccessProfileInput struct {
	Code          *string   `json:"code"`        // patch: opcional
	Name          *string   `json:"name"`        // patch: opcional
	Description   *string   `json:"description"` // patch: opcional (pode limpar)
	IsDefault     *bool     `json:"is_default"`  // patch: opcional
	PermissionIDs *[]string `json:"permissionIds"`
}

type AccessProfileHandler struct {
	DB *sql.DB
}

func NewProfileHandler(db *sql.DB) *AccessProfileHandler {
	return &AccessProfileHandler{DB: db}
}

// ============================================================================
// REGISTRO DE ROTAS (PADRÃO ServeMux, igual ProductHandler)
// ============================================================================

func (h *AccessProfileHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/access-profiles", h.handleAccessProfiles)
	mux.HandleFunc("/access-profiles/", h.handleAccessProfileByID)
}

// /access-profiles  -> GET (list) / POST (create)
func (h *AccessProfileHandler) handleAccessProfiles(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListAccessProfiles(w, r)
	case http.MethodPost:
		h.CreateAccessProfile(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// /access-profiles/{id} -> GET / PUT / DELETE
func (h *AccessProfileHandler) handleAccessProfileByID(w http.ResponseWriter, r *http.Request) {
	// pega o trecho depois de "/access-profiles/"
	id := strings.TrimPrefix(r.URL.Path, "/access-profiles/")
	id = strings.TrimSpace(id)

	if id == "" || strings.Contains(id, "/") {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetAccessProfile(w, r, id)
	case http.MethodPut:
		h.UpdateAccessProfile(w, r, id)
	case http.MethodDelete:
		h.DeleteAccessProfile(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// ============================================================================
// HELPERS DE PERMISSÕES DO PERFIL
// ============================================================================

// carrega todos os permission_ids do perfil (por tenant + profile)
func (h *AccessProfileHandler) loadProfilePermissionIDs(tenantID, profileID string) ([]string, error) {
	rows, err := h.DB.Query(`
		SELECT permission_id
		  FROM access_profile_permissions
		 WHERE tenant_id  = $1
		   AND profile_id = $2
		 ORDER BY permission_id
	`, tenantID, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// remove todas as permissões de um perfil (para quando for substituir no update)
func (h *AccessProfileHandler) deleteProfilePermissionsTX(tx *sql.Tx, tenantID, profileID string) error {
	_, err := tx.Exec(`
		DELETE FROM access_profile_permissions
		 WHERE tenant_id  = $1
		   AND profile_id = $2
	`, tenantID, profileID)
	return err
}

// insere permissões em access_profile_permissions dentro da mesma TX
func (h *AccessProfileHandler) insertProfilePermissionsTX(tx *sql.Tx, tenantID, profileID string, permissionIDs []string) error {
	if len(permissionIDs) == 0 {
		return nil
	}

	// dedup em memória para evitar repetir permissão
	seen := make(map[string]struct{})
	for _, pid := range permissionIDs {
		pid = strings.TrimSpace(pid)
		if pid == "" {
			continue
		}
		if _, ok := seen[pid]; ok {
			continue
		}
		seen[pid] = struct{}{}

		_, err := tx.Exec(`
			INSERT INTO access_profile_permissions (
				tenant_id,
				profile_id,
				permission_id
			) VALUES ($1, $2, $3)
		`, tenantID, profileID, pid)
		if err != nil {
			return err
		}
	}

	return nil
}

// ============================================================================
// LISTAR PERFIS
// GET /access-profiles?search=...
// search filtra por code ou name (case-insensitive)
// ============================================================================
func (h *AccessProfileHandler) ListAccessProfiles(w http.ResponseWriter, r *http.Request) {
	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("search"))

	args := []any{tenantID}
	where := "tenant_id = $1"

	if search != "" {
		// procura em code e name
		args = append(args, "%"+search+"%")
		where += " AND (unaccent(code) ILIKE unaccent($2) OR unaccent(name) ILIKE unaccent($2))"
	}

	query := `
		SELECT
			id,
			tenant_id,
			code,
			name,
			description,
			is_default,
			created_at,
			updated_at
		FROM access_profiles
		WHERE ` + where + `
		ORDER BY name ASC
	`

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "erro ao listar perfis de acesso", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var result []AccessProfile
	for rows.Next() {
		var p AccessProfile
		var desc sql.NullString

		if err := rows.Scan(
			&p.ID,
			&p.TenantID,
			&p.Code,
			&p.Name,
			&desc,
			&p.IsDefault,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			http.Error(w, "erro ao ler perfis de acesso", http.StatusInternalServerError)
			return
		}

		if desc.Valid {
			p.Description = &desc.String
		}

		// carrega permissionIds para cada perfil
		perms, err := h.loadProfilePermissionIDs(tenantID, p.ID)
		if err != nil {
			http.Error(w, "erro ao carregar permissões do perfil", http.StatusInternalServerError)
			return
		}
		p.PermissionIDs = perms

		result = append(result, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ============================================================================
// OBTER PERFIL POR ID
// GET /access-profiles/{id}
// ============================================================================
func (h *AccessProfileHandler) GetAccessProfile(w http.ResponseWriter, r *http.Request, id string) {
	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var p AccessProfile
	var desc sql.NullString

	err = h.DB.QueryRow(`
		SELECT
			id,
			tenant_id,
			code,
			name,
			description,
			is_default,
			created_at,
			updated_at
		FROM access_profiles
		WHERE tenant_id = $1
		  AND id        = $2
	`, tenantID, id).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&desc,
		&p.IsDefault,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "perfil de acesso não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar perfil de acesso", http.StatusInternalServerError)
		return
	}

	if desc.Valid {
		p.Description = &desc.String
	}

	// carrega permissionIds
	perms, err := h.loadProfilePermissionIDs(tenantID, p.ID)
	if err != nil {
		http.Error(w, "erro ao carregar permissões do perfil", http.StatusInternalServerError)
		return
	}
	p.PermissionIDs = perms

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// ============================================================================
// CRIAR PERFIL
// POST /access-profiles
// body:
//
//	{
//	  "code": "admin",
//	  "name": "Administrador",
//	  "description": "Perfil com acesso total",
//	  "is_default": true,
//	  "permissionIds": ["uuid1","uuid2",...]
//	}
//
// ============================================================================
func (h *AccessProfileHandler) CreateAccessProfile(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var in CreateAccessProfileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	// normaliza/valida
	in.Code = strings.TrimSpace(in.Code)
	in.Name = strings.TrimSpace(in.Name)

	if in.Code == "" {
		http.Error(w, "code é obrigatório", http.StatusBadRequest)
		return
	}
	if in.Name == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	// se quiser, pode forçar code em lower/slug aqui:
	in.Code = strings.ToLower(in.Code)

	isDefault := false
	if in.IsDefault != nil {
		isDefault = *in.IsDefault
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// se este perfil for default, desmarca os demais defaults do tenant
	if isDefault {
		if _, err := tx.Exec(`
			UPDATE access_profiles
			   SET is_default = FALSE
			 WHERE tenant_id = $1
			   AND is_default = TRUE
		`, tenantID); err != nil {
			http.Error(w, "erro ao atualizar perfis padrão", http.StatusInternalServerError)
			return
		}
	}

	var out AccessProfile
	var desc sql.NullString

	err = tx.QueryRow(`
		INSERT INTO access_profiles (
			tenant_id,
			code,
			name,
			description,
			is_default
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			tenant_id,
			code,
			name,
			description,
			is_default,
			created_at,
			updated_at
	`,
		tenantID,
		in.Code,
		in.Name,
		in.Description,
		isDefault,
	).Scan(
		&out.ID,
		&out.TenantID,
		&out.Code,
		&out.Name,
		&desc,
		&out.IsDefault,
		&out.CreatedAt,
		&out.UpdatedAt,
	)

	if err != nil {
		// aqui poderia tratar erro 23505 pra dizer "code já existe nesse tenant"
		http.Error(w, "erro ao criar perfil de acesso", http.StatusInternalServerError)
		return
	}

	if desc.Valid {
		out.Description = &desc.String
	}

	// grava a junção access_profile_permissions
	if err := h.insertProfilePermissionsTX(tx, tenantID, out.ID, in.PermissionIDs); err != nil {
		http.Error(w, "erro ao vincular permissões ao perfil", http.StatusInternalServerError)
		return
	}

	// carrega para resposta (dedup / ordenado)
	perms, err := h.loadProfilePermissionIDs(tenantID, out.ID)
	if err != nil {
		http.Error(w, "erro ao carregar permissões do perfil", http.StatusInternalServerError)
		return
	}
	out.PermissionIDs = perms

	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao finalizar transação", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(out)
}

// ============================================================================
// ATUALIZAR PERFIL
// PUT /access-profiles/{id}
// patch completo (envia só o que quiser mudar)
// body:
// { "name": "Novo nome", "is_default": true, "permissionIds": ["..."] }
// ============================================================================
func (h *AccessProfileHandler) UpdateAccessProfile(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var in UpdateAccessProfileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 3) busca atual
	var current AccessProfile
	var desc sql.NullString
	err = tx.QueryRow(`
		SELECT
			id,
			tenant_id,
			code,
			name,
			description,
			is_default,
			created_at,
			updated_at
		FROM access_profiles
		WHERE tenant_id = $1
		  AND id        = $2
	`, tenantID, id).Scan(
		&current.ID,
		&current.TenantID,
		&current.Code,
		&current.Name,
		&desc,
		&current.IsDefault,
		&current.CreatedAt,
		&current.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "perfil de acesso não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar perfil de acesso", http.StatusInternalServerError)
		return
	}

	if desc.Valid {
		current.Description = &desc.String
	}

	// 4) aplica patch em memória
	if in.Code != nil {
		code := strings.TrimSpace(*in.Code)
		if code == "" {
			http.Error(w, "code não pode ser vazio", http.StatusBadRequest)
			return
		}
		current.Code = strings.ToLower(code)
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if name == "" {
			http.Error(w, "name não pode ser vazio", http.StatusBadRequest)
			return
		}
		current.Name = name
	}
	if in.Description != nil {
		// permitir limpar description com string vazia
		descStr := strings.TrimSpace(*in.Description)
		if descStr == "" {
			current.Description = nil
		} else {
			current.Description = &descStr
		}
	}
	if in.IsDefault != nil {
		current.IsDefault = *in.IsDefault
	}

	// 5) se virou default, desmarca outros defaults do tenant
	if in.IsDefault != nil && *in.IsDefault {
		if _, err := tx.Exec(`
			UPDATE access_profiles
			   SET is_default = FALSE
			 WHERE tenant_id = $1
			   AND id       <> $2
			   AND is_default = TRUE
		`, tenantID, id); err != nil {
			http.Error(w, "erro ao atualizar perfis padrão", http.StatusInternalServerError)
			return
		}
	}

	// 6) persiste perfil
	var descOut sql.NullString
	err = tx.QueryRow(`
		UPDATE access_profiles
		   SET code        = $1,
		       name        = $2,
		       description = $3,
		       is_default  = $4
		 WHERE tenant_id   = $5
		   AND id          = $6
		 RETURNING
		   id,
		   tenant_id,
		   code,
		   name,
		   description,
		   is_default,
		   created_at,
		   updated_at
	`,
		current.Code,
		current.Name,
		current.Description,
		current.IsDefault,
		tenantID,
		id,
	).Scan(
		&current.ID,
		&current.TenantID,
		&current.Code,
		&current.Name,
		&descOut,
		&current.IsDefault,
		&current.CreatedAt,
		&current.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "perfil de acesso não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao atualizar perfil de acesso", http.StatusInternalServerError)
		return
	}

	if descOut.Valid {
		current.Description = &descOut.String
	} else {
		current.Description = nil
	}

	// 7) se permissionIds vieram no payload, substitui o conjunto
	if in.PermissionIDs != nil {
		if err := h.deleteProfilePermissionsTX(tx, tenantID, id); err != nil {
			http.Error(w, "erro ao limpar permissões do perfil", http.StatusInternalServerError)
			return
		}
		if err := h.insertProfilePermissionsTX(tx, tenantID, id, *in.PermissionIDs); err != nil {
			http.Error(w, "erro ao atualizar permissões do perfil", http.StatusInternalServerError)
			return
		}
	}

	// carrega permissionIds atualizados para resposta
	perms, err := h.loadProfilePermissionIDs(tenantID, id)
	if err != nil {
		http.Error(w, "erro ao carregar permissões do perfil", http.StatusInternalServerError)
		return
	}
	current.PermissionIDs = perms

	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao finalizar transação", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(current)
}

// ============================================================================
// DELETAR PERFIL
// DELETE /access-profiles/{id}
// (delete físico; ON DELETE CASCADE limpa profile_permissions e user_profiles)
// ============================================================================
func (h *AccessProfileHandler) DeleteAccessProfile(w http.ResponseWriter, r *http.Request, id string) {
	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		DELETE FROM access_profiles
		 WHERE tenant_id = $1
		   AND id        = $2
	`, tenantID, id)
	if err != nil {
		http.Error(w, "erro ao deletar perfil de acesso", http.StatusInternalServerError)
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "perfil de acesso não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
