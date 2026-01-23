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
	TenantID     string  `json:"tenantId"`
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

type ProductHandler struct {
	DB *sql.DB
}

func NewProductHandler(db *sql.DB) *ProductHandler {
	return &ProductHandler{DB: db}
}

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
	if len(code) < 3 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	numStr := code[3:]
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

// POST /products
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

	var prod Product
	if err := json.NewDecoder(r.Body).Decode(&prod); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(prod.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	prod.ID = uuid.NewString()

	nextCode, err := h.generateNextProductCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
		return
	}
	prod.Code = nextCode

	_, err = h.DB.Exec(`
		insert into products (
			id, tenant_id, code, name,
			meta_title, meta_tag, meta_description, 
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
		 $27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52)
	`,
		prod.ID,
		tenantID,
		prod.Code,
		prod.Name,
		prod.MetaTitle,
		prod.MetaTag,
		prod.MetaDescription,
		prod.Reference,
		prod.CategoryCode,
		prod.CategoryName,
		prod.CostPrice,
		prod.SalePrice,
		prod.Sku,
		prod.Ean,
		prod.Weight,
		prod.Length,
		prod.Height,
		prod.Width,
		prod.Ncm,
		prod.Unit,
		prod.ShortDescription,
		prod.LongDescription,
		prod.PromotionCode,
		prod.PromotionName,
		prod.PromotionStart,
		prod.PromotionEnd,
		prod.TaxGroup,
		prod.NcmCode,
		prod.NcmDescription,
		prod.CestCode,
		prod.CestDescription,
		prod.PisCode,
		prod.PisDescription,
		prod.CofinsCode,
		prod.CofinsDescription,
		prod.FiscalOrigin,
		prod.VariationType,
		prod.VariationTypeCode,
		prod.VariationSku,
		prod.VariationEan,
		prod.VariationWeight,
		prod.VariationLength,
		prod.VariationHeight,
		prod.VariationWidth,
		prod.VariationShortDesc,
		prod.VariationLongDesc,
		prod.VariationMetaTitle,
		prod.VariationMetaTag,
		prod.VariationMetaDesc,
		prod.VariationImageLink,
		prod.VideoLink,
		prod.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(prod)
}

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
			name,
			meta_title, meta_tag, meta_description, 
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
			from products
		where tenant_id = $1
		order by
			site_order nulls last,
			name asc
	`, tenantID)

	if err != nil {
		http.Error(w, "erro ao listar produtos: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	products := make([]Product, 0)

	for rows.Next() {
		var c Product
		if err := rows.Scan(
			&c.ID,
			&c.TenantID,
			&c.Code,
			&c.Name,
			&c.MetaTitle,
			&c.MetaTag,
			&c.MetaDescription,
			&c.Reference,
			&c.CategoryCode,
			&c.CategoryName,
			&c.CostPrice,
			&c.SalePrice,
			&c.Sku,
			&c.Ean,
			&c.Weight,
			&c.Length,
			&c.Height,
			&c.Width,
			&c.Ncm,
			&c.Unit,
			&c.ShortDescription,
			&c.LongDescription,
			&c.PromotionCode,
			&c.PromotionName,
			&c.PromotionStart,
			&c.PromotionEnd,
			&c.TaxGroup,
			&c.NcmCode,
			&c.NcmDescription,
			&c.CestCode,
			&c.CestDescription,
			&c.PisCode,
			&c.PisDescription,
			&c.CofinsCode,
			&c.CofinsDescription,
			&c.FiscalOrigin,
			&c.VariationType,
			&c.VariationTypeCode,
			&c.VariationSku,
			&c.VariationEan,
			&c.VariationWeight,
			&c.VariationLength,
			&c.VariationHeight,
			&c.VariationWidth,
			&c.VariationShortDesc,
			&c.VariationLongDesc,
			&c.VariationMetaTitle,
			&c.VariationMetaTag,
			&c.VariationMetaDesc,
			&c.VariationImageLink,
			&c.VideoLink,
			&c.OtherLinks,
		); err != nil {
			http.Error(w, "erro ao ler produtos: "+err.Error(), http.StatusInternalServerError)
			return
		}
		products = append(products, c)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar produtos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(products)
}

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
			name,
			meta_title, meta_tag, meta_description,
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		from products
		where id = $1
		and tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&p.MetaTitle,
		&p.MetaTag,
		&p.MetaDescription,
		&p.Reference,
		&p.CategoryCode,
		&p.CategoryName,
		&p.CostPrice,
		&p.SalePrice,
		&p.Sku,
		&p.Ean,
		&p.Weight,
		&p.Length,
		&p.Height,
		&p.Width,
		&p.Ncm,
		&p.Unit,
		&p.ShortDescription,
		&p.LongDescription,
		&p.PromotionCode,
		&p.PromotionName,
		&p.PromotionStart,
		&p.PromotionEnd,
		&p.TaxGroup,
		&p.NcmCode,
		&p.NcmDescription,
		&p.CestCode,
		&p.CestDescription,
		&p.PisCode,
		&p.PisDescription,
		&p.CofinsCode,
		&p.CofinsDescription,
		&p.FiscalOrigin,
		&p.VariationType,
		&p.VariationTypeCode,
		&p.VariationSku,
		&p.VariationEan,
		&p.VariationWeight,
		&p.VariationLength,
		&p.VariationHeight,
		&p.VariationWidth,
		&p.VariationShortDesc,
		&p.VariationLongDesc,
		&p.VariationMetaTitle,
		&p.VariationMetaTag,
		&p.VariationMetaDesc,
		&p.VariationImageLink,
		&p.VideoLink,
		&p.OtherLinks,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

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

	// Validação básica
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	res, err := h.DB.Exec(`
		update products
		set
				name           = $1,
				meta_title     = $2,
				meta_tag       = $3,
				meta_description = $4,
				reference      = $5,
				category_code  = $6,
				category_name  = $7,
				cost_price     = $8,
				sale_price     = $9,
				sku            = $10,
				ean            = $11,
				weight         = $12,
				length         = $13,
				height         = $14,
				width          = $15,
				ncm            = $16,
				unit             = $17,
				short_description = $18,
				long_description  = $19,
				promotion_code  = $20,
				promotion_name  = $21,
				promotion_start = $22,
				promotion_end   = $23,
				tax_group          = $24,
				ncm_code           = $25,
				ncm_description    = $26,
				cest_code          = $27,
				cest_description   = $28,
				pis_code           = $29,
				pis_description    = $30,
				cofins_code        = $31,
				cofins_description = $32,
				fiscal_origin      = $33,
				variation_type      = $34,
				variation_type_code  = $35,
				variation_sku       = $36,
				variation_ean       = $37,
				variation_weight    = $38,
				variation_length    = $39,
				variation_height    = $40,
				variation_width     = $41,
				variation_short_desc = $42,
				variation_long_desc  = $43,
				variation_meta_title = $44,
				variation_meta_tag   = $45,
				variation_meta_desc  = $46,
				variation_image_link = $47,
				video_link          = $48,
				other_links         = $49
		where id        = $50
		   and tenant_id  = $51
	`,
		in.Name,
		in.MetaTitle,
		in.MetaTag,
		in.MetaDescription,
		in.Reference,
		in.CategoryCode,
		in.CategoryName,
		in.CostPrice,
		in.SalePrice,
		in.Sku,
		in.Ean,
		in.Weight,
		in.Length,
		in.Height,
		in.Width,
		in.Ncm,
		in.Unit,
		in.ShortDescription,
		in.LongDescription,
		in.PromotionCode,
		in.PromotionName,
		in.PromotionStart,
		in.PromotionEnd,
		in.TaxGroup,
		in.NcmCode,
		in.NcmDescription,
		in.CestCode,
		in.CestDescription,
		in.PisCode,
		in.PisDescription,
		in.CofinsCode,
		in.CofinsDescription,
		in.FiscalOrigin,
		in.VariationType,
		in.VariationTypeCode,
		in.VariationSku,
		in.VariationEan,
		in.VariationWeight,
		in.VariationLength,
		in.VariationHeight,
		in.VariationWidth,
		in.VariationShortDesc,
		in.VariationLongDesc,
		in.VariationMetaTitle,
		in.VariationMetaTag,
		in.VariationMetaDesc,
		in.VariationImageLink,
		in.VideoLink,
		in.OtherLinks,
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

	// Recarrega o produto já atualizado para devolver
	var p Product
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			meta_title, meta_tag, meta_description,
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		from products
		where id = $1
		and tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&p.MetaTitle,
		&p.MetaTag,
		&p.MetaDescription,
		&p.Reference,
		&p.CategoryCode,
		&p.CategoryName,
		&p.CostPrice,
		&p.SalePrice,
		&p.Sku,
		&p.Ean,
		&p.Weight,
		&p.Length,
		&p.Height,
		&p.Width,
		&p.Ncm,
		&p.Unit,
		&p.ShortDescription,
		&p.LongDescription,
		&p.PromotionCode,
		&p.PromotionName,
		&p.PromotionStart,
		&p.PromotionEnd,
		&p.TaxGroup,
		&p.NcmCode,
		&p.NcmDescription,
		&p.CestCode,
		&p.CestDescription,
		&p.PisCode,
		&p.PisDescription,
		&p.CofinsCode,
		&p.CofinsDescription,
		&p.FiscalOrigin,
		&p.VariationType,
		&p.VariationTypeCode,
		&p.VariationSku,
		&p.VariationEan,
		&p.VariationWeight,
		&p.VariationLength,
		&p.VariationHeight,
		&p.VariationWidth,
		&p.VariationShortDesc,
		&p.VariationLongDesc,
		&p.VariationMetaTitle,
		&p.VariationMetaTag,
		&p.VariationMetaDesc,
		&p.VariationImageLink,
		&p.VideoLink,
		&p.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao buscar produto atualizado: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

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

	res, err := h.DB.Exec(`delete from produtos where id = $1 and tenant_id = $2`, id, tenantID)
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
			name,
			meta_title, meta_tag, meta_description,
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		from products
		where code = $1
		and tenant_id = $2
	`, code, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&p.MetaTitle,
		&p.MetaTag,
		&p.MetaDescription,
		&p.Reference,
		&p.CategoryCode,
		&p.CategoryName,
		&p.CostPrice,
		&p.SalePrice,
		&p.Sku,
		&p.Ean,
		&p.Weight,
		&p.Length,
		&p.Height,
		&p.Width,
		&p.Ncm,
		&p.Unit,
		&p.ShortDescription,
		&p.LongDescription,
		&p.PromotionCode,
		&p.PromotionName,
		&p.PromotionStart,
		&p.PromotionEnd,
		&p.TaxGroup,
		&p.NcmCode,
		&p.NcmDescription,
		&p.CestCode,
		&p.CestDescription,
		&p.PisCode,
		&p.PisDescription,
		&p.CofinsCode,
		&p.CofinsDescription,
		&p.FiscalOrigin,
		&p.VariationType,
		&p.VariationTypeCode,
		&p.VariationSku,
		&p.VariationEan,
		&p.VariationWeight,
		&p.VariationLength,
		&p.VariationHeight,
		&p.VariationWidth,
		&p.VariationShortDesc,
		&p.VariationLongDesc,
		&p.VariationMetaTitle,
		&p.VariationMetaTag,
		&p.VariationMetaDesc,
		&p.VariationImageLink,
		&p.VideoLink,
		&p.OtherLinks,
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
			name,
			meta_title,
			meta_tag,
			meta_description,
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		from products
		where id = $1
		and tenant_id = $2
	`, id, tenantID).Scan(
		&original.Name,
		&original.MetaTitle,
		&original.MetaTag,
		&original.MetaDescription,
		&original.Reference,
		&original.CategoryCode,
		&original.CategoryName,
		&original.CostPrice,
		&original.SalePrice,
		&original.Sku,
		&original.Ean,
		&original.Weight,
		&original.Length,
		&original.Height,
		&original.Width,
		&original.Ncm,
		&original.Unit,
		&original.ShortDescription,
		&original.LongDescription,
		&original.PromotionCode,
		&original.PromotionName,
		&original.PromotionStart,
		&original.PromotionEnd,
		&original.TaxGroup,
		&original.NcmCode,
		&original.NcmDescription,
		&original.CestCode,
		&original.CestDescription,
		&original.PisCode,
		&original.PisDescription,
		&original.CofinsCode,
		&original.CofinsDescription,
		&original.FiscalOrigin,
		&original.VariationType,
		&original.VariationTypeCode,
		&original.VariationSku,
		&original.VariationEan,
		&original.VariationWeight,
		&original.VariationLength,
		&original.VariationHeight,
		&original.VariationWidth,
		&original.VariationShortDesc,
		&original.VariationLongDesc,
		&original.VariationMetaTitle,
		&original.VariationMetaTag,
		&original.VariationMetaDesc,
		&original.VariationImageLink,
		&original.VideoLink,
		&original.OtherLinks,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 🔢 gera próximo código PROD00X
	var nextNumber int
	_ = h.DB.QueryRow(`
		select coalesce(max(substring(code from '[0-9]+')::int), 0) + 1
		from products
	`).Scan(&nextNumber)

	newCode := fmt.Sprintf("PROD%03d", nextNumber)
	newID := uuid.NewString()

	_, err = h.DB.Exec(`
		insert into products (
			id, tenant_id, code, name,
			meta_title, meta_tag, meta_description, 
			reference, category_code, category_name, cost_price, sale_price,
			sku, ean, weight, length, height, width, ncm,
			unit, short_description, long_description,
			promotion_code, promotion_name, promotion_start, promotion_end,
			tax_group, ncm_code, ncm_description,
			cest_code, cest_description,
			pis_code, pis_description,
			cofins_code, cofins_description,
			fiscal_origin,
			variation_type, variation_type_code, variation_sku, variation_ean,
			variation_weight, variation_length, variation_height, variation_width,
			variation_short_desc, variation_long_desc,
			variation_meta_title, variation_meta_tag, variation_meta_desc,
			variation_image_link, video_link, other_links
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
		 $27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52)
	`,
		original.ID,
		tenantID,
		original.Code,
		original.Name,
		original.MetaTitle,
		original.MetaTag,
		original.MetaDescription,
		original.Reference,
		original.CategoryCode,
		original.CategoryName,
		original.CostPrice,
		original.SalePrice,
		original.Sku,
		original.Ean,
		original.Weight,
		original.Length,
		original.Height,
		original.Width,
		original.Ncm,
		original.Unit,
		original.ShortDescription,
		original.LongDescription,
		original.PromotionCode,
		original.PromotionName,
		original.PromotionStart,
		original.PromotionEnd,
		original.TaxGroup,
		original.NcmCode,
		original.NcmDescription,
		original.CestCode,
		original.CestDescription,
		original.PisCode,
		original.PisDescription,
		original.CofinsCode,
		original.CofinsDescription,
		original.FiscalOrigin,
		original.VariationType,
		original.VariationTypeCode,
		original.VariationSku,
		original.VariationEan,
		original.VariationWeight,
		original.VariationLength,
		original.VariationHeight,
		original.VariationWidth,
		original.VariationShortDesc,
		original.VariationLongDesc,
		original.VariationMetaTitle,
		original.VariationMetaTag,
		original.VariationMetaDesc,
		original.VariationImageLink,
		original.VideoLink,
		original.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	original.ID = newID
	original.Code = newCode
	original.Name = original.Name + " (Cópia)"

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(original)
}
