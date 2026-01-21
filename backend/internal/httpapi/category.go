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

func getTenantIDFromHeader(r *http.Request) (string, error) {
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

type CategoryHandler struct {
	DB *sql.DB
}

func NewCategoryHandler(db *sql.DB) *CategoryHandler {
	return &CategoryHandler{DB: db}
}

// Registra as rotas relacionadas a Category
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

// POST /categories
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	tenantID, err := getTenantIDFromHeader(r)
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

func (h *CategoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	tenantID, err := getTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := h.DB.Query(`
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
	`, tenantID)
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

func (h *CategoryHandler) GetCategoryByID(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	tenantID, err := getTenantIDFromHeader(r)
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

func (h *CategoryHandler) UpdateCategory(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	defer r.Body.Close()

	tenantID, err := getTenantIDFromHeader(r)
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

func (h *CategoryHandler) DeleteCategory(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	tenantID, err := getTenantIDFromHeader(r)
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

func (h *CategoryHandler) handleCategoryByCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	tenantID, err := getTenantIDFromHeader(r)
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

func (h *CategoryHandler) handleDuplicateCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	tenantID, err := getTenantIDFromHeader(r)
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
