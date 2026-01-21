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

type Product struct {
	//Dados Principais
	ID           string  `json:"id"`
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	Reference    *string `json:"reference"`
	CategoryCode *string `json:"categoryCode"`
	CategoryName *string `json:"categoryName"`
	CostPrice    *string `json:"costPrice"`
	SalePrice    *string `json:"SalePrice"`
	Sku          *int    `json:"sku"`
	Ean          *string `json:"ean"`
	Weight       *string `json:"weight"`
	Length       *string `json:"length"`
	Height       *string `json:"height"`
	Width        *string `json:"width"`
	Ncm          *string `json:"ncm"`
	// Configurações
	Unit             *string `json:"unit"`
	ShortDescription *string `json:"shortDescription"`
	LongDescription  *string `json:"longDescription"`
	MetaTitle        *string `json:"metaTitle"`
	MetaTag          *string `json:"metaTag"`
	MetaDescription  *string `json:"metaDescription"`
	// Regra Comercial
	PromotionCode  *string `json:"promotionCode"`
	PromotionName  *string `json:"promotionName"`
	PromotionStart *int    `json:"promotionStart"`
	PromotionEnd   *string `json:"promotionEnd"`
	// Tributação
	TaxGroup          *string `json:"taxGroup"`
	NcmCode           *string `json:"ncmCode"`
	NcmDescription    *string `json:"ncmDescription"`
	CestCode          *string `json:"cestCode"`
	CestDescription   *string `json:"cestDescription"`
	PisCode           *string `json:"pisCode"`
	PisDescription    *string `json:"pisDescription"`
	CofinsCode        *string `json:"cofinsCode"`
	CofinsDescription *string `json:"cofinsDescription"`
	FiscalOrigin      *string `json:"fiscalOrigin"`
	// Variações
	VariationType      *string `json:"VariationType"`
	VariationTypeCode  *string `json:"variationTypeCode"`
	VariationSku       *string `json:"variationSku"`
	VariationEan       *string `json:"variationEan"`
	VariationWeight    *string `json:"variationWeight"`
	VariationLength    *string `json:"variationLength"`
	VariationHeight    *string `json:"variationHeight"`
	VariationWidth     *string `json:"variationWidth"`
	VariationShortDesc *string `json:"variationShortDesc"`
	VariationLongDesc  *string `json:"variationLongDesc"`
	VariationMetaTitle *string `json:"variationMetaTitle"`
	VariationMetaTag   *string `json:"variationMetaTag"`
	VariationMetaDesc  *string `json:"variationMetaDesc"`
	VariationImageLink *string `json:"variationImageLink"`
	VideoLink          *string `json:"videoLink"`
	OtherLinks         *string `json:"otherLinks"`
}

type ProductUpdateInput struct {
	Name         string  `json:"name"`
	Reference    *string `json:"reference"`
	CategoryCode *string `json:"categoryCode"`
	CategoryName *string `json:"categoryName"`
	CostPrice    *string `json:"costPrice"`
	SalePrice    *string `json:"SalePrice"`
	Sku          *int    `json:"sku"`
	Ean          *string `json:"ean"`
	Weight       *string `json:"weight"`
	Length       *string `json:"length"`
	Height       *string `json:"height"`
	Width        *string `json:"width"`
	Ncm          *string `json:"ncm"`
	// Configurações
	Unit             *string `json:"unit"`
	ShortDescription *string `json:"shortDescription"`
	LongDescription  *string `json:"longDescription"`
	MetaTitle        *string `json:"metaTitle"`
	MetaTag          *string `json:"metaTag"`
	MetaDescription  *string `json:"metaDescription"`
	// Regra Comercial
	PromotionCode  *string `json:"promotionCode"`
	PromotionName  *string `json:"promotionName"`
	PromotionStart *int    `json:"promotionStart"`
	PromotionEnd   *string `json:"promotionEnd"`
	// Tributação
	TaxGroup          *string `json:"taxGroup"`
	NcmCode           *string `json:"ncmCode"`
	NcmDescription    *string `json:"ncmDescription"`
	CestCode          *string `json:"cestCode"`
	CestDescription   *string `json:"cestDescription"`
	PisCode           *string `json:"pisCode"`
	PisDescription    *string `json:"pisDescription"`
	CofinsCode        *string `json:"cofinsCode"`
	CofinsDescription *string `json:"cofinsDescription"`
	FiscalOrigin      *string `json:"fiscalOrigin"`
	// Variações
	VariationType      *string `json:"VariationType"`
	VariationTypeCode  *string `json:"variationTypeCode"`
	VariationSku       *string `json:"variationSku"`
	VariationEan       *string `json:"variationEan"`
	VariationWeight    *string `json:"variationWeight"`
	VariationLength    *string `json:"variationLength"`
	VariationHeight    *string `json:"variationHeight"`
	VariationWidth     *string `json:"variationWidth"`
	VariationShortDesc *string `json:"variationShortDesc"`
	VariationLongDesc  *string `json:"variationLongDesc"`
	VariationMetaTitle *string `json:"variationMetaTitle"`
	VariationMetaTag   *string `json:"variationMetaTag"`
	VariationMetaDesc  *string `json:"variationMetaDesc"`
	VariationImageLink *string `json:"variationImageLink"`
	VideoLink          *string `json:"videoLink"`
	OtherLinks         *string `json:"otherLinks"`
}

func (h *ProductHandler) generateNextProductCode() (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select code
		  from products
		 where code like 'PROD%'
		 order by code desc
		 limit 1
	`).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		// primeiro produto
		return "PROD001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código: %w", err)
	}

	code := lastCode.String
	if len(code) < 3 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	numStr := code[3:] // pega só os dígitos depois de PROD
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}
	num++

	return fmt.Sprintf("PROD%03d", num), nil
}

type ProductHandler struct {
	DB *sql.DB
}

func NewProductHandler(db *sql.DB) *ProductHandler {
	return &ProductHandler{DB: db}
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
	id := strings.TrimPrefix(r.URL.Path, "/categories/")
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

// POST /categories
func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var cat Product
	if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(cat.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	cat.ID = uuid.NewString()

	nextCode, err := h.generateNextProductCode()
	if err != nil {
		http.Error(w, "erro ao gerar código da categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}
	cat.Code = nextCode

	_, err = h.DB.Exec(`
		insert into categories (
			id, code, name, parent_code, parent_name,
			meta_title, meta_tag, meta_description,
			site_order, site_link, description
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		cat.ID,
		cat.Code,
		cat.Name,
		cat.MetaTitle,
		cat.MetaTag,
		cat.MetaDescription,
	)
	if err != nil {
		http.Error(w, "erro ao salvar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(cat)
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		select
			id,
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
		order by
			site_order nulls last,
			name asc
	`)
	if err != nil {
		http.Error(w, "erro ao listar categorias: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cats := make([]Product, 0)

	for rows.Next() {
		var c Product
		if err := rows.Scan(
			&c.ID,
			&c.Code,
			&c.Name,
			&c.MetaTitle,
			&c.MetaTag,
			&c.MetaDescription,
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

func (h *ProductHandler) GetProductByID(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	var c Product

	err := h.DB.QueryRow(`
		select
			id,
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
	`, id).Scan(
		&c.ID,
		&c.Code,
		&c.Name,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
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

func (h *ProductHandler) UpdateProduct(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	defer r.Body.Close()

	var in ProductUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	// Validação básica
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update categories
		   set name            = $1,
		       parent_code     = $2,
		       parent_name     = $3,
		       meta_title      = $4,
		       meta_tag        = $5,
		       meta_description= $6,
		       site_order      = $7,
		       site_link       = $8,
		       description     = $9
		 where id = $10
	`,
		in.Name,
		in.MetaTitle,
		in.MetaTag,
		in.MetaDescription,
		id,
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

	// Recarrega a categoria já atualizada para devolver
	var c Product
	err = h.DB.QueryRow(`
		select
			id,
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
	`, id).Scan(
		&c.ID,
		&c.Code,
		&c.Name,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
	)
	if err != nil {
		http.Error(w, "erro ao buscar categoria atualizada: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

func (h *ProductHandler) DeleteProduct(
	w http.ResponseWriter,
	r *http.Request,
	id string,
) {
	res, err := h.DB.Exec(`delete from categories where id = $1`, id)
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

func (h *ProductHandler) handleProductByCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "parâmetro 'code' é obrigatório", http.StatusBadRequest)
		return
	}

	var c Product
	err := h.DB.QueryRow(`
		select
			id,
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
	`, code).Scan(
		&c.ID,
		&c.Code,
		&c.Name,
		&c.MetaTitle,
		&c.MetaTag,
		&c.MetaDescription,
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

func (h *ProductHandler) handleDuplicateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/categories/duplicate/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	var original Product

	err := h.DB.QueryRow(`
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
	`, id).Scan(
		&original.Name,
		&original.MetaTitle,
		&original.MetaTag,
		&original.MetaDescription,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "categoria não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 🔢 gera próximo código CAT00X
	var nextNumber int
	_ = h.DB.QueryRow(`
		select coalesce(max(substring(code from '[0-9]+')::int), 0) + 1
		from categories
	`).Scan(&nextNumber)

	newCode := fmt.Sprintf("CAT%03d", nextNumber)
	newID := uuid.NewString()

	_, err = h.DB.Exec(`
		insert into categories (
			id, code, name, parent_code, parent_name,
			meta_title, meta_tag, meta_description,
			site_order, site_link, description
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		newID,
		newCode,
		original.Name+" (Cópia)",
		original.MetaTitle,
		original.MetaTag,
		original.MetaDescription,
	)

	if err != nil {
		http.Error(w, "erro ao duplicar categoria: "+err.Error(), http.StatusInternalServerError)
		return
	}

	original.ID = newID
	original.Code = newCode
	original.Name = original.Name + " (Cópia)"

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(original)
}
