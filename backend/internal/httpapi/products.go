package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// ============================================================
// MODELS
// ============================================================

// Representa o produto conforme o que existe HOJE na tabela
type Product struct {
	ID       string `json:"id"`
	TenantID string `json:"tenant_id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
}

// Entrada de criação/edição: por enquanto só nome
type ProductCreateInput struct {
	Name string `json:"name"`
}

type ProductUpdateInput struct {
	Name string `json:"name"`
}

// ============================================================
// HANDLER
// ============================================================

type ProductHandler struct {
	DB *sql.DB
}

func NewProductHandler(db *sql.DB) *ProductHandler {
	return &ProductHandler{DB: db}
}

// Gera próximo código PROD001, PROD002... por tenant
func (h *ProductHandler) generateNextProductCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select code
		  from products
		 where tenant_id = $1
		   and code like 'PROD%'
		 order by code desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		// primeiro produto
		return "PROD001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código: %w", err)
	}

	code := lastCode.String
	if len(code) < 4 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	numStr := code[4:] // depois de "PROD"
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}
	num++

	return fmt.Sprintf("PROD%03d", num), nil
}

// Registra as rotas relacionadas a Product
func (h *ProductHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/products", h.handleProducts)
	mux.HandleFunc("/products/", h.handleProductByID)
	mux.HandleFunc("/products/by-code", h.handleProductByCode)
	mux.HandleFunc("/products/duplicate/", h.handleDuplicateProduct)
}

// Decide o que fazer dependendo do método HTTP
func (h *ProductHandler) handleProducts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateProduct(w, r)
	case http.MethodGet:
		h.ListProducts(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *ProductHandler) handleProductByID(w http.ResponseWriter, r *http.Request) {
	// BUG que tinha aqui: estava "/categories/"
	id := strings.TrimPrefix(r.URL.Path, "/products/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetProductByID(w, r, id)
	case http.MethodPut:
		h.UpdateProduct(w, r, id)
	case http.MethodDelete:
		h.DeleteProduct(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// ============================================================
// POST /products
// Front manda: { "name": "Produto X" }
// ============================================================

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// 1) exige sessão válida (Authorization: Bearer <token>)
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenantId obrigatório no header
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var in ProductCreateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	id := uuid.NewString()

	nextCode, err := h.generateNextProductCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = h.DB.Exec(`
		insert into products (id, tenant_id, code, name)
		values ($1, $2, $3, $4)
	`,
		id,
		tenantID,
		nextCode,
		in.Name,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	prod := Product{
		ID:       id,
		TenantID: tenantID,
		Code:     nextCode,
		Name:     in.Name,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(prod)
}

// ============================================================
// GET /products
// ============================================================

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	// 1) exige sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenantId do header
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := h.DB.Query(`
		select
			id,
			tenant_id,
			code,
			name
		  from products
		 where tenant_id = $1
		 order by name asc
	`, tenantID)

	if err != nil {
		http.Error(w, "erro ao listar produtos: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	products := make([]Product, 0)

	for rows.Next() {
		var p Product
		if err := rows.Scan(
			&p.ID,
			&p.TenantID,
			&p.Code,
			&p.Name,
		); err != nil {
			http.Error(w, "erro ao ler produtos: "+err.Error(), http.StatusInternalServerError)
			return
		}
		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar produtos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(products)
}

// ============================================================
// GET /products/{id}
// ============================================================

func (h *ProductHandler) GetProductByID(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	// 1) sessão
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// 2) tenant do header
	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var p Product

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name
		from products
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

// ============================================================
// PUT /products/{id}
// Front manda só { "name": "Novo nome" } por enquanto
// ============================================================

func (h *ProductHandler) UpdateProduct(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
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

	var in ProductUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update products
		   set name = $1
		 where id = $2
		   and tenant_id = $3
	`,
		in.Name,
		id,
		tenantID,
	)

	if err != nil {
		http.Error(w, "erro ao atualizar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}

	// Recarrega o produto atualizado
	var p Product
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name
		from products
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
	)
	if err != nil {
		http.Error(w, "erro ao buscar produto atualizado: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

// ============================================================
// DELETE /products/{id}
// ============================================================

func (h *ProductHandler) DeleteProduct(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
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

	// BUG aqui: estava "delete from produtos"
	res, err := h.DB.Exec(`
		delete from products
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID)
	if err != nil {
		http.Error(w, "erro ao excluir produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ============================================================
// GET /products/by-code?code=PROD001
// ============================================================

func (h *ProductHandler) handleProductByCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

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

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "parâmetro 'code' é obrigatório", http.StatusBadRequest)
		return
	}

	var p Product
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name
		from products
		where code = $1
		  and tenant_id = $2
	`, code, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

// ============================================================
// POST /products/duplicate/{id}
// Duplicação simples, copiando só name e gerando novo code
// ============================================================

func (h *ProductHandler) handleDuplicateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

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

	id := strings.TrimPrefix(r.URL.Path, "/products/duplicate/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	var original Product

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name
		from products
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&original.ID,
		&original.TenantID,
		&original.Code,
		&original.Name,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// novo id + novo código
	newID := uuid.NewString()
	newCode, err := h.generateNextProductCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// insere cópia
	_, err = h.DB.Exec(`
		insert into products (id, tenant_id, code, name)
		values ($1, $2, $3, $4)
	`,
		newID,
		tenantID,
		newCode,
		original.Name+" (Cópia)",
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto copiado: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := Product{
		ID:       newID,
		TenantID: tenantID,
		Code:     newCode,
		Name:     original.Name + " (Cópia)",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}
