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
// MODELOS (Tabelas globais - sem tenant)
// -----------------------------------------------------------------------------

type NCM struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`        // 8
	Description string     `json:"description"` // obrigatório
	ExVersion   *string    `json:"exVersion"`
	CreatedAt   *time.Time `json:"createdAt,omitempty"`
}

type CEST struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`        // 7
	Description string     `json:"description"` // obrigatório
	NCMCode     *string    `json:"ncmCode"`
	CreatedAt   *time.Time `json:"createdAt,omitempty"`
}

type CFOP struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`        // 4
	Description string     `json:"description"` // obrigatório
	Type        *string    `json:"type"`
	CreatedAt   *time.Time `json:"createdAt,omitempty"`
}

// Inputs (Create/Update)
type NCMInput struct {
	Code        string  `json:"code"`
	Description string  `json:"description"`
	ExVersion   *string `json:"exVersion"`
}

type CESTInput struct {
	Code        string  `json:"code"`
	Description string  `json:"description"`
	NCMCode     *string `json:"ncmCode"`
}

type CFOPInput struct {
	Code        string  `json:"code"`
	Description string  `json:"description"`
	Type        *string `json:"type"`
}

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Registro das rotas normativas (CRUD)
func (h *TaxHandler) RegisterNormativeRoutes(mux *http.ServeMux) {
	// NCM
	mux.HandleFunc("/ncm", h.handleNCMs)
	mux.HandleFunc("/ncm/", h.handleNCMByID)

	// CEST
	mux.HandleFunc("/cest", h.handleCESTs)
	mux.HandleFunc("/cest/", h.handleCESTByID)

	// CFOP
	mux.HandleFunc("/cfops", h.handleCFOPs)
	mux.HandleFunc("/cfops/", h.handleCFOPByID)

	// Lookups (já existentes no seu exemplo)
	mux.HandleFunc("/lookups/ncm", h.handleSearchNCM)
	mux.HandleFunc("/lookups/cest", h.handleSearchCEST)
	mux.HandleFunc("/lookups/cfop", h.handleSearchCFOP)
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

func parsePaging(r *http.Request) (page int, pageSize int, offset int) {
	page = 1
	pageSize = 50

	pageStr := r.URL.Query().Get("page")
	sizeStr := r.URL.Query().Get("page_size")

	if v, err := strconv.Atoi(pageStr); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(sizeStr); err == nil && v > 0 && v <= 200 {
		pageSize = v
	}

	offset = (page - 1) * pageSize
	return
}

func isDigitsOnly(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func normalizeNullableStringPtr(s *string) *string {
	if s == nil {
		return nil
	}
	v := strings.TrimSpace(*s)
	if v == "" {
		return nil
	}
	return &v
}

// -----------------------------------------------------------------------------
// NCM - ROUTERS INTERNOS
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleNCMs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListNCMs(w, r)
	case http.MethodPost:
		h.CreateNCM(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *TaxHandler) handleNCMByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/ncm/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetNCMByID(w, r, id)
	case http.MethodPut:
		h.UpdateNCM(w, r, id)
	case http.MethodDelete:
		h.DeleteNCM(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// NCM - CRUD
// -----------------------------------------------------------------------------

// ListNCMs
// GET /ncm?q=...&page=1&page_size=50
func (h *TaxHandler) ListNCMs(w http.ResponseWriter, r *http.Request) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	_, pageSize, offset := parsePaging(r)

	var rows *sql.Rows
	var err error

	if q != "" {
		rows, err = h.DB.Query(`
			select id, code, description, ex_version, created_at
			  from ncm_codes
			 where code = $1
			    or code ilike '%' || $1 || '%'
			    or description ilike '%' || $1 || '%'
			 order by code asc
			 limit $2 offset $3
		`, q, pageSize, offset)
	} else {
		rows, err = h.DB.Query(`
			select id, code, description, ex_version, created_at
			  from ncm_codes
			 order by code asc
			 limit $1 offset $2
		`, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]NCM, 0)
	for rows.Next() {
		var n NCM
		if err := rows.Scan(&n.ID, &n.Code, &n.Description, &n.ExVersion, &n.CreatedAt); err != nil {
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

// CreateNCM
// POST /ncm
func (h *TaxHandler) CreateNCM(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in NCMInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.ExVersion = normalizeNullableStringPtr(in.ExVersion)

	if in.Code == "" || len(in.Code) != 8 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (NCM deve ter 8 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}

	newID := uuid.NewString()

	_, err := h.DB.Exec(`
		insert into ncm_codes (id, code, description, ex_version)
		values ($1,$2,$3,$4)
	`, newID, in.Code, in.Description, in.ExVersion)
	if err != nil {
		// Unique constraint geralmente cai aqui
		http.Error(w, "erro ao salvar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := NCM{
		ID:          newID,
		Code:        in.Code,
		Description: in.Description,
		ExVersion:   in.ExVersion,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

// GetNCMByID
// GET /ncm/{id}
func (h *TaxHandler) GetNCMByID(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var n NCM
	err := h.DB.QueryRow(`
		select id, code, description, ex_version, created_at
		  from ncm_codes
		 where id = $1
	`, id).Scan(&n.ID, &n.Code, &n.Description, &n.ExVersion, &n.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "NCM não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(n)
}

// UpdateNCM
// PUT /ncm/{id}
func (h *TaxHandler) UpdateNCM(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in NCMInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.ExVersion = normalizeNullableStringPtr(in.ExVersion)

	if in.Code == "" || len(in.Code) != 8 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (NCM deve ter 8 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update ncm_codes
		   set code = $1,
		       description = $2,
		       ex_version = $3
		 where id = $4
	`, in.Code, in.Description, in.ExVersion, id)
	if err != nil {
		http.Error(w, "erro ao atualizar NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "NCM não encontrado", http.StatusNotFound)
		return
	}

	h.GetNCMByID(w, r, id)
}

// DeleteNCM
// DELETE /ncm/{id}
func (h *TaxHandler) DeleteNCM(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	res, err := h.DB.Exec(`delete from ncm_codes where id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir NCM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "NCM não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -----------------------------------------------------------------------------
// CEST - ROUTERS INTERNOS
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleCESTs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListCESTs(w, r)
	case http.MethodPost:
		h.CreateCEST(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *TaxHandler) handleCESTByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cest/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetCESTByID(w, r, id)
	case http.MethodPut:
		h.UpdateCEST(w, r, id)
	case http.MethodDelete:
		h.DeleteCEST(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// CEST - CRUD
// -----------------------------------------------------------------------------

func (h *TaxHandler) ListCESTs(w http.ResponseWriter, r *http.Request) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	_, pageSize, offset := parsePaging(r)

	var rows *sql.Rows
	var err error

	if q != "" {
		rows, err = h.DB.Query(`
			select id, code, description, ncm_code, created_at
			  from cest_codes
			 where code = $1
			    or code ilike '%' || $1 || '%'
			    or description ilike '%' || $1 || '%'
			    or ncm_code ilike '%' || $1 || '%'
			 order by code asc
			 limit $2 offset $3
		`, q, pageSize, offset)
	} else {
		rows, err = h.DB.Query(`
			select id, code, description, ncm_code, created_at
			  from cest_codes
			 order by code asc
			 limit $1 offset $2
		`, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]CEST, 0)
	for rows.Next() {
		var c CEST
		if err := rows.Scan(&c.ID, &c.Code, &c.Description, &c.NCMCode, &c.CreatedAt); err != nil {
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

func (h *TaxHandler) CreateCEST(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in CESTInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.NCMCode = normalizeNullableStringPtr(in.NCMCode)

	if in.Code == "" || len(in.Code) != 7 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (CEST deve ter 7 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}
	if in.NCMCode != nil {
		if len(*in.NCMCode) != 8 || !isDigitsOnly(*in.NCMCode) {
			http.Error(w, "ncmCode inválido (deve ter 8 dígitos numéricos)", http.StatusBadRequest)
			return
		}
	}

	newID := uuid.NewString()

	_, err := h.DB.Exec(`
		insert into cest_codes (id, code, description, ncm_code)
		values ($1,$2,$3,$4)
	`, newID, in.Code, in.Description, in.NCMCode)
	if err != nil {
		http.Error(w, "erro ao salvar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := CEST{
		ID:          newID,
		Code:        in.Code,
		Description: in.Description,
		NCMCode:     in.NCMCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

func (h *TaxHandler) GetCESTByID(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var c CEST
	err := h.DB.QueryRow(`
		select id, code, description, ncm_code, created_at
		  from cest_codes
		 where id = $1
	`, id).Scan(&c.ID, &c.Code, &c.Description, &c.NCMCode, &c.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "CEST não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

func (h *TaxHandler) UpdateCEST(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in CESTInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.NCMCode = normalizeNullableStringPtr(in.NCMCode)

	if in.Code == "" || len(in.Code) != 7 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (CEST deve ter 7 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}
	if in.NCMCode != nil {
		if len(*in.NCMCode) != 8 || !isDigitsOnly(*in.NCMCode) {
			http.Error(w, "ncmCode inválido (deve ter 8 dígitos numéricos)", http.StatusBadRequest)
			return
		}
	}

	res, err := h.DB.Exec(`
		update cest_codes
		   set code = $1,
		       description = $2,
		       ncm_code = $3
		 where id = $4
	`, in.Code, in.Description, in.NCMCode, id)
	if err != nil {
		http.Error(w, "erro ao atualizar CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "CEST não encontrado", http.StatusNotFound)
		return
	}

	h.GetCESTByID(w, r, id)
}

func (h *TaxHandler) DeleteCEST(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	res, err := h.DB.Exec(`delete from cest_codes where id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir CEST: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "CEST não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -----------------------------------------------------------------------------
// CFOP - ROUTERS INTERNOS
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleCFOPs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListCFOPs(w, r)
	case http.MethodPost:
		h.CreateCFOP(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *TaxHandler) handleCFOPByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cfops/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetCFOPByID(w, r, id)
	case http.MethodPut:
		h.UpdateCFOP(w, r, id)
	case http.MethodDelete:
		h.DeleteCFOP(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// CFOP - CRUD
// -----------------------------------------------------------------------------

func (h *TaxHandler) ListCFOPs(w http.ResponseWriter, r *http.Request) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	_, pageSize, offset := parsePaging(r)

	var rows *sql.Rows
	var err error

	if q != "" {
		rows, err = h.DB.Query(`
			select id, code, description, type, created_at
			  from cfops
			 where code = $1
			    or code ilike '%' || $1 || '%'
			    or description ilike '%' || $1 || '%'
			    or type ilike '%' || $1 || '%'
			 order by code asc
			 limit $2 offset $3
		`, q, pageSize, offset)
	} else {
		rows, err = h.DB.Query(`
			select id, code, description, type, created_at
			  from cfops
			 order by code asc
			 limit $1 offset $2
		`, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]CFOP, 0)
	for rows.Next() {
		var c CFOP
		if err := rows.Scan(&c.ID, &c.Code, &c.Description, &c.Type, &c.CreatedAt); err != nil {
			http.Error(w, "erro ao ler CFOP: "+err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

func (h *TaxHandler) CreateCFOP(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in CFOPInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.Type = normalizeNullableStringPtr(in.Type)

	if in.Code == "" || len(in.Code) != 4 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (CFOP deve ter 4 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}

	newID := uuid.NewString()

	_, err := h.DB.Exec(`
		insert into cfops (id, code, description, type)
		values ($1,$2,$3,$4)
	`, newID, in.Code, in.Description, in.Type)
	if err != nil {
		http.Error(w, "erro ao salvar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := CFOP{
		ID:          newID,
		Code:        in.Code,
		Description: in.Description,
		Type:        in.Type,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

func (h *TaxHandler) GetCFOPByID(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var c CFOP
	err := h.DB.QueryRow(`
		select id, code, description, type, created_at
		  from cfops
		 where id = $1
	`, id).Scan(&c.ID, &c.Code, &c.Description, &c.Type, &c.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "CFOP não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

func (h *TaxHandler) UpdateCFOP(w http.ResponseWriter, r *http.Request, id string) {
	defer r.Body.Close()

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var in CFOPInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Description = strings.TrimSpace(in.Description)
	in.Type = normalizeNullableStringPtr(in.Type)

	if in.Code == "" || len(in.Code) != 4 || !isDigitsOnly(in.Code) {
		http.Error(w, "code inválido (CFOP deve ter 4 dígitos numéricos)", http.StatusBadRequest)
		return
	}
	if in.Description == "" {
		http.Error(w, "description é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update cfops
		   set code = $1,
		       description = $2,
		       type = $3
		 where id = $4
	`, in.Code, in.Description, in.Type, id)
	if err != nil {
		http.Error(w, "erro ao atualizar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "CFOP não encontrado", http.StatusNotFound)
		return
	}

	h.GetCFOPByID(w, r, id)
}

func (h *TaxHandler) DeleteCFOP(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	res, err := h.DB.Exec(`delete from cfops where id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "CFOP não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -----------------------------------------------------------------------------
// LOOKUP CFOP (mín 3 chars, até 50) - padrão do seu /lookups/ncm e /lookups/cest
// -----------------------------------------------------------------------------

func (h *TaxHandler) handleSearchCFOP(w http.ResponseWriter, r *http.Request) {
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
		_ = json.NewEncoder(w).Encode([]CFOP{})
		return
	}

	rows, err := h.DB.Query(`
		select id, code, description, type
		  from cfops
		 where code ilike '%' || $1 || '%'
		    or description ilike '%' || $1 || '%'
		    or type ilike '%' || $1 || '%'
		 order by code asc
		 limit 50
	`, q)
	if err != nil {
		http.Error(w, "erro ao buscar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := make([]CFOP, 0)
	for rows.Next() {
		var c CFOP
		if err := rows.Scan(&c.ID, &c.Code, &c.Description, &c.Type); err != nil {
			http.Error(w, "erro ao ler CFOP: "+err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar CFOP: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

// -----------------------------------------------------------------------------
// (Opcional) mensagem melhor pra unique violation (se você quiser usar)
// -----------------------------------------------------------------------------

func wrapUniqueErr(prefix string, err error) error {
	// sem dependência de driver específico; mantém simples
	return fmt.Errorf("%s: %w", prefix, err)
}
