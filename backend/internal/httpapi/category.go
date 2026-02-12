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

type Category struct {
	ID              string  `json:"id"`
	TenantID        string  `json:"tenantId"`
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	ParentCode      *string `json:"parentCode"`
	ParentName      *string `json:"parentName"`
	MetaTitle       *string `json:"metaTitle"`
	MetaTag         *string `json:"metaTag"`
	MetaDescription *string `json:"metaDescription"`
	SiteOrder       *int    `json:"siteOrder"`
	SiteLink        *string `json:"siteLink"`
	Description     *string `json:"description"`
}

type CategoryUpdateInput struct {
	Name            string  `json:"name"`
	ParentCode      *string `json:"parentCode"`
	ParentName      *string `json:"parentName"`
	MetaTitle       *string `json:"metaTitle"`
	MetaTag         *string `json:"metaTag"`
	MetaDescription *string `json:"metaDescription"`
	SiteOrder       *int    `json:"siteOrder"`
	SiteLink        *string `json:"siteLink"`
	Description     *string `json:"description"`
}

type CategoryHandler struct {
	DB *sql.DB
}

func NewCategoryHandler(db *sql.DB) *CategoryHandler {
	return &CategoryHandler{DB: db}
}

func (h *CategoryHandler) generateNextCategoryCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select code
		  from categories
		 where tenant_id = $1
		   and code like 'CAT%'
		 order by code desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		return "CAT001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código: %w", err)
	}

	code := lastCode.String
	if len(code) < 3 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	numStr := code[3:]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}
	num++

	return fmt.Sprintf("CAT%03d", num), nil
}

// -----------------------------------------------------------------------------
// Registro de rotas
// -----------------------------------------------------------------------------

func (h *CategoryHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/categories", h.handleCategories)
	mux.HandleFunc("/categories/", h.handleCategoryByID)
	mux.HandleFunc("/categories/by-code", h.handleCategoryByCode)
	mux.HandleFunc("/categories/duplicate/", h.handleDuplicateCategory)
}

// Decide o que fazer dependendo do método HTTP
func (h *CategoryHandler) handleCategories(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateCategory(w, r)
	case http.MethodGet:
		h.ListCategories(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *CategoryHandler) handleCategoryByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/categories/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetCategoryByID(w, r, id)
	case http.MethodPut:
		h.UpdateCategory(w, r, id)
	case http.MethodDelete:
		h.DeleteCategory(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// POST /categories
// -----------------------------------------------------------------------------

// CreateCategory godoc
// @Summary     Cria uma categoria
// @Description Cria uma nova categoria (gera code CAT### automaticamente por tenant)
// @Tags        Categories
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       body body Category true "Dados da categoria (name obrigatório)"
// @Success     201 {object} Category
// @Failure     400 {string} string "Erro de validação / JSON inválido / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories [post]

func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
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

	var cat Category
	if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(cat.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	cat.ID = uuid.NewString()
	cat.TenantID = tenantID

	nextCode, err := h.generateNextCategoryCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código da categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}
	cat.Code = nextCode

	_, err = h.DB.Exec(`
		insert into categories (
			id, tenant_id, code, name, parent_code, parent_name,
			meta_title, meta_tag, meta_description,
			site_order, site_link, description
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
	`,
		cat.ID,
		cat.TenantID,
		cat.Code,
		cat.Name,
		cat.ParentCode,
		cat.ParentName,
		cat.MetaTitle,
		cat.MetaTag,
		cat.MetaDescription,
		cat.SiteOrder,
		cat.SiteLink,
		cat.Description,
	)
	if err != nil {
		http.Error(w, "erro ao salvar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(cat)
}

// -----------------------------------------------------------------------------
// GET /categories
// -----------------------------------------------------------------------------

// ListCategories godoc
// @Summary     Lista categorias
// @Description Lista categorias do tenant com paginação e busca opcional por código ou nome
// @Tags        Categories
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       q query string false "Busca por code exato ou name contendo (case-insensitive)"
// @Param       page query int false "Página (default 1)"
// @Param       page_size query int false "Tamanho da página (default 50, max 200)"
// @Success     200 {array} Category
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories [get]
func (h *CategoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
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

	// 3) parâmetros de busca / paginação
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	pageStr := r.URL.Query().Get("page")
	sizeStr := r.URL.Query().Get("page_size")

	page := 1
	pageSize := 50 // default

	if v, err := strconv.Atoi(pageStr); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(sizeStr); err == nil && v > 0 && v <= 200 {
		pageSize = v
	}

	offset := (page - 1) * pageSize

	var rows *sql.Rows

	// 4) monta query de acordo com se tem filtro ou não
	if q != "" {
		// Busca por:
		//   - code exato
		//   - name contendo q (case-insensitive)
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				code,
				name,
				parent_code,
				parent_name,
				meta_title,
				meta_tag,
				meta_description,
				site_order,
				site_link,
				description
			from categories
			where tenant_id = $1
			  and (
			       code = $2
			       or name ilike '%' || $2 || '%'
			  )
			order by
				site_order nulls last,
				name asc
			limit $3 offset $4
		`, tenantID, q, pageSize, offset)
	} else {
		// Lista normal, só paginada
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				code,
				name,
				parent_code,
				parent_name,
				meta_title,
				meta_tag,
				meta_description,
				site_order,
				site_link,
				description
			from categories
			where tenant_id = $1
			order by
				site_order nulls last,
				name asc
			limit $2 offset $3
		`, tenantID, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar categorias: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cats := make([]Category, 0)

	for rows.Next() {
		var c Category
		if err := rows.Scan(
			&c.ID,
			&c.TenantID,
			&c.Code,
			&c.Name,
			&c.ParentCode,
			&c.ParentName,
			&c.MetaTitle,
			&c.MetaTag,
			&c.MetaDescription,
			&c.SiteOrder,
			&c.SiteLink,
			&c.Description,
		); err != nil {
			http.Error(w, "erro ao ler categorias: "+err.Error(), http.StatusInternalServerError)
			return
		}
		cats = append(cats, c)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar categorias: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(cats)
}

// -----------------------------------------------------------------------------
// GET /categories/{id}
// -----------------------------------------------------------------------------

// GetCategoryByID godoc
// @Summary     Busca categoria por ID
// @Description Retorna uma categoria pelo ID dentro do tenant
// @Tags        Categories
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID da categoria"
// @Success     200 {object} Category
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Categoria não encontrada"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories/{id} [get]
func (h *CategoryHandler) GetCategoryByID(
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

	var c Category

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			parent_code,
			parent_name,
			meta_title,
			meta_tag,
			meta_description,
			site_order,
			site_link,
			description
		from categories
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&c.ID,
		&c.TenantID,
		&c.Code,
		&c.Name,
		&c.ParentCode,
		&c.ParentName,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
		&c.SiteOrder,
		&c.SiteLink,
		&c.Description,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

// -----------------------------------------------------------------------------
// PUT /categories/{id}
// -----------------------------------------------------------------------------

// UpdateCategory godoc
// @Summary     Atualiza categoria
// @Description Atualiza os campos de uma categoria pelo ID dentro do tenant
// @Tags        Categories
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID da categoria"
// @Param       body body CategoryUpdateInput true "Dados para atualização (name obrigatório)"
// @Success     200 {object} Category
// @Failure     400 {string} string "Erro de validação / JSON inválido / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Categoria não encontrada"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories/{id} [put]
func (h *CategoryHandler) UpdateCategory(
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

	var in CategoryUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update categories
		   set name             = $1,
		       parent_code      = $2,
		       parent_name      = $3,
		       meta_title       = $4,
		       meta_tag         = $5,
		       meta_description = $6,
		       site_order       = $7,
		       site_link        = $8,
		       description      = $9
		 where id        = $10
		   and tenant_id  = $11
	`,
		in.Name,
		in.ParentCode,
		in.ParentName,
		in.MetaTitle,
		in.MetaTag,
		in.MetaDescription,
		in.SiteOrder,
		in.SiteLink,
		in.Description,
		id,
		tenantID,
	)
	if err != nil {
		http.Error(w, "erro ao atualizar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}

	// recarrega
	var c Category
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			parent_code,
			parent_name,
			meta_title,
			meta_tag,
			meta_description,
			site_order,
			site_link,
			description
		from categories
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&c.ID,
		&c.TenantID,
		&c.Code,
		&c.Name,
		&c.ParentCode,
		&c.ParentName,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
		&c.SiteOrder,
		&c.SiteLink,
		&c.Description,
	)
	if err != nil {
		http.Error(w, "erro ao buscar categoria atualizada: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

// -----------------------------------------------------------------------------
// DELETE /categories/{id}
// -----------------------------------------------------------------------------

// DeleteCategory godoc
// @Summary     Exclui categoria
// @Description Exclui uma categoria pelo ID dentro do tenant
// @Tags        Categories
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID da categoria"
// @Success     204 {string} string "Sem conteúdo"
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Categoria não encontrada"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(
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

	res, err := h.DB.Exec(`
		delete from categories
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID)
	if err != nil {
		http.Error(w, "erro ao excluir categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// -----------------------------------------------------------------------------
// GET /categories/by-code?code=CAT001
// -----------------------------------------------------------------------------

// GetCategoryByCode godoc
// @Summary     Busca categoria por código
// @Description Retorna uma categoria pelo code (ex: CAT001) dentro do tenant
// @Tags        Categories
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       code query string true "Código da categoria (ex: CAT001)"
// @Success     200 {object} Category
// @Failure     400 {string} string "Parâmetro code obrigatório / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Categoria não encontrada"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories/by-code [get]
func (h *CategoryHandler) handleCategoryByCode(w http.ResponseWriter, r *http.Request) {
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

	var c Category
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			parent_code,
			parent_name,
			meta_title,
			meta_tag,
			meta_description,
			site_order,
			site_link,
			description
		from categories
		where code = $1
		  and tenant_id = $2
	`, code, tenantID).Scan(
		&c.ID,
		&c.TenantID,
		&c.Code,
		&c.Name,
		&c.ParentCode,
		&c.ParentName,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
		&c.SiteOrder,
		&c.SiteLink,
		&c.Description,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

// -----------------------------------------------------------------------------
// POST /categories/duplicate/{id}
// -----------------------------------------------------------------------------

// DuplicateCategory godoc
// @Summary     Duplica categoria
// @Description Duplica uma categoria por ID, gerando novo ID e novo code CAT### no mesmo tenant
// @Tags        Categories
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID da categoria a duplicar"
// @Success     201 {object} Category
// @Failure     400 {string} string "ID não informado / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Categoria não encontrada"
// @Failure     500 {string} string "Erro interno"
// @Router      /categories/duplicate/{id} [post]
func (h *CategoryHandler) handleDuplicateCategory(w http.ResponseWriter, r *http.Request) {
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

	id := strings.TrimPrefix(r.URL.Path, "/categories/duplicate/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	var original Category

	err = h.DB.QueryRow(`
		select
			name,
			parent_code,
			parent_name,
			meta_title,
			meta_tag,
			meta_description,
			site_order,
			site_link,
			description
		from categories
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&original.Name,
		&original.ParentCode,
		&original.ParentName,
		&original.MetaTitle,
		&original.MetaTag,
		&original.MetaDescription,
		&original.SiteOrder,
		&original.SiteLink,
		&original.Description,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// gera próximo código SÓ desse tenant
	var nextNumber int
	_ = h.DB.QueryRow(`
		select coalesce(max(substring(code from '[0-9]+')::int), 0) + 1
		  from categories
		 where tenant_id = $1
	`, tenantID).Scan(&nextNumber)

	newCode := fmt.Sprintf("CAT%03d", nextNumber)
	newID := uuid.NewString()

	_, err = h.DB.Exec(`
		insert into categories (
			id, tenant_id, code, name, parent_code, parent_name,
			meta_title, meta_tag, meta_description,
			site_order, site_link, description
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
	`,
		newID,
		tenantID,
		newCode,
		original.Name+" (Cópia)",
		original.ParentCode,
		original.ParentName,
		original.MetaTitle,
		original.MetaTag,
		original.MetaDescription,
		original.SiteOrder,
		original.SiteLink,
		original.Description,
	)
	if err != nil {
		http.Error(w, "erro ao duplicar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	original.ID = newID
	original.TenantID = tenantID
	original.Code = newCode
	original.Name = original.Name + " (Cópia)"

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(original)
}
