package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
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
	TipoProduto  string    `json:"TipoProduto"` // ex: revenda, industrializacao, servico
	UseICMSST    bool      `json:"useICMSST"`
	UsePISCOFINS bool      `json:"usePISCOFINS"`
	UseISS       bool      `json:"useISS"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Entrada para criar/atualizar
type TaxGroupInput struct {
	Name         string `json:"name"`
	Regime       string `json:"regime"`
	TipoProduto  string `json:"TipoProduto"`
	UseICMSST    *bool  `json:"useICMSST"`
	UsePISCOFINS *bool  `json:"usePISCOFINS"`
	UseISS       *bool  `json:"useISS"`
	Active       *bool  `json:"active"`
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

func (h *TaxHandler) generateNextTaxCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select code
		  from tax_groups
		 where tenant_id = $1
		   and code like 'TXG%'
		 order by code desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	// nenhum código ainda -> começa em TXG001
	if err == sql.ErrNoRows || !lastCode.Valid {
		return "TXG001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código de grupo de tributação: %w", err)
	}

	code := lastCode.String
	if len(code) < 4 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	// prefixo "TXG" (3 chars), pega só a parte numérica
	numStr := code[3:]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}
	num++

	return fmt.Sprintf("TXG%03d", num), nil
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
				tipo_produto,
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
				tipo_produto,
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
			&tg.TipoProduto,
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

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	newID := uuid.NewString()
	nextCode, err := h.generateNextTaxCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ativo := true
	if in.Active != nil {
		ativo = *in.Active
	}

	useICMSST := true
	if in.UseICMSST != nil {
		useICMSST = *in.UseICMSST
	}

	usePISCOFINS := true
	if in.UsePISCOFINS != nil {
		usePISCOFINS = *in.UsePISCOFINS
	}

	useISS := true
	if in.UseISS != nil {
		useISS = *in.UseISS
	}

	_, err = h.DB.Exec(`
		insert into tax_groups (
			id,
			tenant_id,
			code,
			name,
			regime,
			tipo_produto,
			use_icms_st,
			use_pis_cofins,
			use_iss,
			active
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	`,
		newID,
		tenantID,
		nextCode,
		strings.TrimSpace(in.Name),
		strings.TrimSpace(in.Regime),
		strings.TrimSpace(in.TipoProduto),
		useICMSST,
		usePISCOFINS,
		useISS,
		ativo,
	)
	if err != nil {
		http.Error(w, "erro ao salvar grupo de tributação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := TaxGroup{
		ID:           newID,
		TenantID:     tenantID,
		Code:         nextCode,
		Name:         strings.TrimSpace(in.Name),
		Regime:       strings.TrimSpace(in.Regime),
		TipoProduto:  strings.TrimSpace(in.TipoProduto),
		UseICMSST:    useICMSST,
		UsePISCOFINS: usePISCOFINS,
		UseISS:       useISS,
		Active:       ativo,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
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
			tipo_produto,
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
		&tg.TipoProduto,
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

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	// Mesma lógica de defaults do CreateTaxGroup
	ativo := true
	if in.Active != nil {
		ativo = *in.Active
	}

	useICMSST := true
	if in.UseICMSST != nil {
		useICMSST = *in.UseICMSST
	}

	usePISCOFINS := true
	if in.UsePISCOFINS != nil {
		usePISCOFINS = *in.UsePISCOFINS
	}

	useISS := true
	if in.UseISS != nil {
		useISS = *in.UseISS
	}

	res, err := h.DB.Exec(`
		update tax_groups
		   set name           = $1,
		       regime         = $2,
		       tipo_produto   = $3,
		       use_icms_st    = $4,
		       use_pis_cofins = $5,
		       use_iss        = $6,
		       active         = $7,
		       updated_at     = now()
		 where id        = $8
		   and tenant_id  = $9
	`,
		strings.TrimSpace(in.Name),
		strings.TrimSpace(in.Regime),
		strings.TrimSpace(in.TipoProduto),
		useICMSST,
		usePISCOFINS,
		useISS,
		ativo,
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

	// recarrega o registro atualizado
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
