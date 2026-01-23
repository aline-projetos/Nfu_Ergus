package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Tenant struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Document     string    `json:"document"`
	DocumentType string    `json:"documentType"`
	Ativo        bool      `json:"ativo"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type TenantInput struct {
	Name         string `json:"name"`
	Document     string `json:"document"`
	DocumentType string `json:"documentType"`
	Ativo        *bool  `json:"ativo"` // pointer pra diferenciar não enviado x enviado
}

type TenantHandler struct {
	DB *sql.DB
}

func NewTenantHandler(db *sql.DB) *TenantHandler {
	return &TenantHandler{DB: db}
}

func (h *TenantHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/tenants", h.handleTenants)
	mux.HandleFunc("/tenants/", h.handleTenantByID)
}

// ------------------------
// Helpers de validação
// ------------------------

func normalizeDocument(doc string) string {
	var b strings.Builder
	for _, r := range doc {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func validateTenantInput(in *TenantInput) (string, string, string, string) {
	// retorna: name, document, documentType, errorMsg

	name := strings.TrimSpace(in.Name)
	if name == "" {
		return "", "", "", "name é obrigatório"
	}

	rawDoc := strings.TrimSpace(in.Document)
	if rawDoc == "" {
		return "", "", "", "document é obrigatório"
	}

	doc := normalizeDocument(rawDoc)
	if len(doc) != 11 && len(doc) != 14 {
		return "", "", "", "document deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)"
	}

	docType := strings.ToUpper(strings.TrimSpace(in.DocumentType))
	if docType != "CPF" && docType != "CNPJ" {
		return "", "", "", "document_type deve ser CPF ou CNPJ"
	}

	if docType == "CPF" && len(doc) != 11 {
		return "", "", "", "document_type CPF exige document com 11 dígitos"
	}
	if docType == "CNPJ" && len(doc) != 14 {
		return "", "", "", "document_type CNPJ exige document com 14 dígitos"
	}

	// sem erro
	return name, doc, docType, ""
}

// ------------------------
// Rotas raiz /tenants
// ------------------------

func (h *TenantHandler) handleTenants(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateTenant(w, r)
	case http.MethodGet:
		h.ListTenants(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// ------------------------
// Rotas /tenants/{id}
// ------------------------

func (h *TenantHandler) handleTenantByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/tenants/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	// valida se é UUID – evita SQL desnecessário
	if _, err := uuid.Parse(id); err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetTenantByID(w, r, id)
	case http.MethodPut:
		h.UpdateTenant(w, r, id)
	case http.MethodDelete:
		h.DeleteTenant(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// ------------------------
// POST /tenants
// ------------------------

func (h *TenantHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// exige sessão válida e super admin
	sess, err := RequireSession(h.DB, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	if !sess.IsSuperAdmin {
		http.Error(w, "apenas super administrador pode acessar este recurso", http.StatusForbidden)
		return
	}

	var in TenantInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	name, doc, docType, errMsg := validateTenantInput(&in)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	var t Tenant
	err = h.DB.QueryRow(`
		INSERT INTO tenants (name, document, document_type, ativo)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, document, document_type, ativo, created_at, updated_at
	`,
		name,
		doc,
		docType,
		ativo,
	).Scan(
		&t.ID,
		&t.Name,
		&t.Document,
		&t.DocumentType,
		&t.Ativo,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err != nil {
		// trata unique violation (document já cadastrado)
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "já existe um tenant com esse document", http.StatusConflict)
			return
		}
		http.Error(w, "erro ao criar tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(t)
}

// ------------------------
// GET /tenants
// ------------------------

func (h *TenantHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	// exige sessão válida e super admin
	_, err := RequireSession(h.DB, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// futuramente dá pra filtrar por ?ativo=true/false
	rows, err := h.DB.Query(`
		SELECT
			id,
			name,
			document,
			document_type,
			ativo,
			created_at,
			updated_at
		FROM tenants
		ORDER BY name ASC
	`)
	if err != nil {
		http.Error(w, "erro ao listar tenants: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tenants := make([]Tenant, 0)

	for rows.Next() {
		var t Tenant
		if err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.Document,
			&t.DocumentType,
			&t.Ativo,
			&t.CreatedAt,
			&t.UpdatedAt,
		); err != nil {
			http.Error(w, "erro ao ler tenants: "+err.Error(), http.StatusInternalServerError)
			return
		}
		tenants = append(tenants, t)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar tenants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tenants)
}

// ------------------------
// GET /tenants/{id}
// ------------------------

func (h *TenantHandler) GetTenantByID(w http.ResponseWriter, r *http.Request, id string) {
	// exige sessão válida e super admin
	sess, err := RequireSession(h.DB, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	if !sess.IsSuperAdmin {
		http.Error(w, "apenas super administrador pode acessar este recurso", http.StatusForbidden)
		return
	}

	var t Tenant

	err = h.DB.QueryRow(`
		SELECT
			id,
			name,
			document,
			document_type,
			ativo,
			created_at,
			updated_at
		FROM tenants
		WHERE id = $1
	`, id).Scan(
		&t.ID,
		&t.Name,
		&t.Document,
		&t.DocumentType,
		&t.Ativo,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "tenant não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(t)
}

// ------------------------
// PUT /tenants/{id}
// ------------------------

func (h *TenantHandler) UpdateTenant(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	// exige sessão válida e super admin
	sess, err := RequireSession(h.DB, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	if !sess.IsSuperAdmin {
		http.Error(w, "apenas super administrador pode acessar este recurso", http.StatusForbidden)
		return
	}

	var in TenantInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	name, doc, docType, errMsg := validateTenantInput(&in)
	if errMsg != "" {
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	var t Tenant
	err = h.DB.QueryRow(`
		UPDATE tenants
		   SET name          = $1,
		       document      = $2,
		       document_type = $3,
		       ativo         = $4,
		       updated_at    = NOW()
		 WHERE id = $5
		RETURNING
			id,
			name,
			document,
			document_type,
			ativo,
			created_at,
			updated_at
	`,
		name,
		doc,
		docType,
		ativo,
		id,
	).Scan(
		&t.ID,
		&t.Name,
		&t.Document,
		&t.DocumentType,
		&t.Ativo,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "tenant não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "já existe um tenant com esse document", http.StatusConflict)
			return
		}
		http.Error(w, "erro ao atualizar tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(t)
}

// ------------------------
// DELETE /tenants/{id}
// ------------------------
// Soft delete: ativo = false
func (h *TenantHandler) DeleteTenant(w http.ResponseWriter, r *http.Request, id string) {
	// exige sessão válida e super admin
	sess, err := RequireSession(h.DB, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	if !sess.IsSuperAdmin {
		http.Error(w, "apenas super administrador pode acessar este recurso", http.StatusForbidden)
		return
	}

	res, err := h.DB.Exec(`
		UPDATE tenants
		   SET ativo      = FALSE,
		       updated_at = NOW()
		 WHERE id = $1
	`, id)
	if err != nil {
		http.Error(w, "erro ao inativar tenant: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "tenant não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
