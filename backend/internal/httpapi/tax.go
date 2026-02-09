package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// -----------------------------------------------------------------------------
// MODELOS
// -----------------------------------------------------------------------------

// Grupo de Tributação (tabela tax_groups)
type TaxGroup struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	Regime       string    `json:"regime"`      // ex: simples_nacional, lucro_presumido
	ProductType  string    `json:"productType"` // ex: revenda, industrializacao, servico
	UseICMSST    bool      `json:"useICMSST"`
	UsePISCOFINS bool      `json:"usePISCOFINS"`
	UseISS       bool      `json:"useISS"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Entrada para criar/atualizar
type TaxGroupInput struct {
	Code         string `json:"code"`
	Name         string `json:"name"`
	Regime       string `json:"regime"`
	ProductType  string `json:"productType"`
	UseICMSST    bool   `json:"useICMSST"`
	UsePISCOFINS bool   `json:"usePISCOFINS"`
	UseISS       bool   `json:"useISS"`
	Active       bool   `json:"active"`
}

// NCM (lookup)
type NCM struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	ExVersion   *string `json:"exVersion"`
}

// CEST (lookup)
type CEST struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	NCMCode     *string `json:"ncmCode"`
}

// -----------------------------------------------------------------------------
// HANDLER
// -----------------------------------------------------------------------------

type TaxHandler struct {
	DB *sql.DB
}

func NewTaxHandler(db *sql.DB) *TaxHandler {
	return &TaxHandler{DB: db}
}

// Registro das rotas de tributação
func (h *TaxHandler) RegisterRoutes(mux *http.ServeMux) {
	// grupos de tributação
	mux.HandleFunc("/tax-groups", h.handleTaxGroups)
	mux.HandleFunc("/tax-groups/", h.handleTaxGroupByID)

	// lookups NCM/CEST
	mux.HandleFunc("/lookups/ncm", h.handleSearchNCM)
	mux.HandleFunc("/lookups/cest", h.handleSearchCEST)
}

// -----------------------------------------------------------------------------
// ROUTERS INTERNOS
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleTaxGroups(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListTaxGroups(w, r)
	case http.MethodPost:
		h.CreateTaxGroup(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *TaxHandler) handleTaxGroupByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/tax-groups/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetTaxGroupByID(w, r, id)
	case http.MethodPut:
		h.UpdateTaxGroup(w, r, id)
	case http.MethodDelete:
		h.DeleteTaxGroup(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// LISTAR /tax-groups
// Suporta:
//   - GET /tax-groups
//   - GET /tax-groups?q=revenda
//   - GET /tax-groups?page=1&page_size=50
// -----------------------------------------------------------------------------

func (h *TaxHandler) ListTaxGroups(w http.ResponseWriter, r *http.Request) {
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

	// 3) filtros e paginação
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	pageStr := r.URL.Query().Get("page")
	sizeStr := r.URL.Query().Get("page_size")

	page := 1
	pageSize := 50

	if v, err := strconv.Atoi(pageStr); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(sizeStr); err == nil && v > 0 && v <= 200 {
		pageSize = v
	}

	offset := (page - 1) * pageSize

	var rows *sql.Rows

	if q != "" {
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				code,
				name,
				regime,
				product_type,
				use_icms_st,
				use_pis_cofins,
				use_iss,
				active,
				created_at,
				updated_at
			  from tax_groups
			 where tenant_id = $1
			   and (
					code = $2
					or name ilike '%' || $2 || '%'
			   )
			 order by name asc
			 limit $3 offset $4
		`, tenantID, q, pageSize, offset)
	} else {
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				code,
				name,
				regime,
				product_type,
				use_icms_st,
				use_pis_cofins,
				use_iss,
				active,
				created_at,
				updated_at
			  from tax_groups
			 where tenant_id = $1
			 order by name asc
			 limit $2 offset $3
		`, tenantID, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar grupos de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]TaxGroup, 0)

	for rows.Next() {
		var tg TaxGroup
		if err := rows.Scan(
			&tg.ID,
			&tg.TenantID,
			&tg.Code,
			&tg.Name,
			&tg.Regime,
			&tg.ProductType,
			&tg.UseICMSST,
			&tg.UsePISCOFINS,
			&tg.UseISS,
			&tg.Active,
			&tg.CreatedAt,
			&tg.UpdatedAt,
		); err != nil {
			http.Error(w, "erro ao ler grupos de tributação: "+err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, tg)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar grupos de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

// -----------------------------------------------------------------------------
// POST /tax-groups
// -----------------------------------------------------------------------------

func (h *TaxHandler) CreateTaxGroup(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// tenant
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var in TaxGroupInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Code) == "" || strings.TrimSpace(in.Name) == "" {
		http.Error(w, "code e name são obrigatórios", http.StatusBadRequest)
		return
	}

	// valida código único por tenant
	var exists bool
	if err := h.DB.QueryRow(`
		select exists(
			select 1
			  from tax_groups
			 where tenant_id = $1
			   and code = $2
		)
	`, tenantID, in.Code).Scan(&exists); err != nil {
		http.Error(w, "erro ao validar código: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "já existe grupo de tributação com esse code", http.StatusBadRequest)
		return
	}

	var tg TaxGroup

	err = h.DB.QueryRow(`
		insert into tax_groups (
			tenant_id,
			code,
			name,
			regime,
			product_type,
			use_icms_st,
			use_pis_cofins,
			use_iss,
			active
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		returning
			id,
			tenant_id,
			code,
			name,
			regime,
			product_type,
			use_icms_st,
			use_pis_cofins,
			use_iss,
			active,
			created_at,
			updated_at
	`,
		tenantID,
		in.Code,
		in.Name,
		in.Regime,
		in.ProductType,
		in.UseICMSST,
		in.UsePISCOFINS,
		in.UseISS,
		in.Active,
	).Scan(
		&tg.ID,
		&tg.TenantID,
		&tg.Code,
		&tg.Name,
		&tg.Regime,
		&tg.ProductType,
		&tg.UseICMSST,
		&tg.UsePISCOFINS,
		&tg.UseISS,
		&tg.Active,
		&tg.CreatedAt,
		&tg.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "erro ao salvar grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(tg)
}

// -----------------------------------------------------------------------------
// GET /tax-groups/{id}
// -----------------------------------------------------------------------------

func (h *TaxHandler) GetTaxGroupByID(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var tg TaxGroup
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			regime,
			product_type,
			use_icms_st,
			use_pis_cofins,
			use_iss,
			active,
			created_at,
			updated_at
		  from tax_groups
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID).Scan(
		&tg.ID,
		&tg.TenantID,
		&tg.Code,
		&tg.Name,
		&tg.Regime,
		&tg.ProductType,
		&tg.UseICMSST,
		&tg.UsePISCOFINS,
		&tg.UseISS,
		&tg.Active,
		&tg.CreatedAt,
		&tg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "grupo de tributação não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tg)
}

// -----------------------------------------------------------------------------
// PUT /tax-groups/{id}
// -----------------------------------------------------------------------------

func (h *TaxHandler) UpdateTaxGroup(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var in TaxGroupInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Code) == "" || strings.TrimSpace(in.Name) == "" {
		http.Error(w, "code e name são obrigatórios", http.StatusBadRequest)
		return
	}

	// valida código único em outro registro
	var exists bool
	if err := h.DB.QueryRow(`
		select exists(
			select 1
			  from tax_groups
			 where tenant_id = $1
			   and code = $2
			   and id <> $3
		)
	`, tenantID, in.Code, id).Scan(&exists); err != nil {
		http.Error(w, "erro ao validar código: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "já existe grupo de tributação com esse code", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update tax_groups
		   set code         = $1,
		       name         = $2,
		       regime       = $3,
		       product_type = $4,
		       use_icms_st  = $5,
		       use_pis_cofins = $6,
		       use_iss      = $7,
		       active       = $8,
		       updated_at   = now()
		 where id        = $9
		   and tenant_id  = $10
	`,
		in.Code,
		in.Name,
		in.Regime,
		in.ProductType,
		in.UseICMSST,
		in.UsePISCOFINS,
		in.UseISS,
		in.Active,
		id,
		tenantID,
	)
	if err != nil {
		http.Error(w, "erro ao atualizar grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "grupo de tributação não encontrado", http.StatusNotFound)
		return
	}

	// recarrega
	h.GetTaxGroupByID(w, r, id)
}

// -----------------------------------------------------------------------------
// DELETE /tax-groups/{id}
// -----------------------------------------------------------------------------

func (h *TaxHandler) DeleteTaxGroup(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		delete from tax_groups
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID)
	if err != nil {
		http.Error(w, "erro ao excluir grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "grupo de tributação não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -----------------------------------------------------------------------------
// GET /lookups/ncm?q=...
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleSearchNCM(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 3 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]NCM{})
		return
	}

	rows, err := h.DB.Query(`
		select
			id,
			code,
			description,
			ex_version
		  from ncm_codes
		 where code ilike '%' || $1 || '%'
		    or description ilike '%' || $1 || '%'
		 order by code asc
		 limit 50
	`, q)
	if err != nil {
		http.Error(w, "erro ao buscar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]NCM, 0)
	for rows.Next() {
		var n NCM
		if err := rows.Scan(
			&n.ID,
			&n.Code,
			&n.Description,
			&n.ExVersion,
		); err != nil {
			http.Error(w, "erro ao ler NCM: "+err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

// -----------------------------------------------------------------------------
// GET /lookups/cest?q=...
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleSearchCEST(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 3 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]CEST{})
		return
	}

	rows, err := h.DB.Query(`
		select
			id,
			code,
			description,
			ncm_code
		  from cest_codes
		 where code ilike '%' || $1 || '%'
		    or description ilike '%' || $1 || '%'
		 order by code asc
		 limit 50
	`, q)
	if err != nil {
		http.Error(w, "erro ao buscar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]CEST, 0)
	for rows.Next() {
		var c CEST
		if err := rows.Scan(
			&c.ID,
			&c.Code,
			&c.Description,
			&c.NCMCode,
		); err != nil {
			http.Error(w, "erro ao ler CEST: "+err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}
