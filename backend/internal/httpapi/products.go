package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ============================================================
// MODELS
// ============================================================

// Representa o produto conforme o que existe HOJE na tabela
type Product struct {
	ID             string  `json:"id"`
	TenantID       string  `json:"tenant_id"`
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	CategoryID     *string `json:"category_id,omitempty"`
	SupplierID     *string `json:"supplier_id,omitempty"`
	ManufacturerID *string `json:"manufacturer_id,omitempty"`
	TaxGroupID     *string `json:"tax_group_id,omitempty"` // FK tax_groups.id
	NCMID          *string `json:"ncm_id,omitempty"`       // FK ncm_codes.id
	CESTID         *string `json:"cest_id,omitempty"`      // FK cest_codes.id
	FiscalOrigin   string  `json:"fiscal_origin"`          // enum fiscal_origin_type ('0'..'8')

	// NOVOS (migracao de links/mídia)
	VideoLink  *string `json:"video_link,omitempty"`
	OtherLinks *string `json:"other_links,omitempty"` // pode ser JSON/string conforme você definiu na migration

	Variations []ProductVariation `json:"variations"`
}

type ProductVariation struct {
	ID          string         `json:"id"`
	ProductID   string         `json:"product_id"`
	Combination string         `json:"combination"`
	IsDefault   bool           `json:"is_default"`
	SKU         string         `json:"sku"`
	EAN         *string        `json:"ean,omitempty"`
	Active      bool           `json:"active"`
	Details     map[string]any `json:"details,omitempty"` // JSONB livre
}

// Entrada de criação/edição
type ProductCreateInput struct {
	Name           string  `json:"name"`
	CategoryID     *string `json:"category_id"`
	SupplierID     *string `json:"supplier_id"`
	ManufacturerID *string `json:"manufacturer_id"`
	TaxGroupID     *string `json:"tax_group_id"`
	NCMID          *string `json:"ncm_id"`
	CESTID         *string `json:"cest_id"`
	FiscalOrigin   *string `json:"fiscal_origin"` // se vier nil, vamos assumir "0"

	// NOVOS
	VideoLink  *string `json:"video_link"`
	OtherLinks *string `json:"other_links"`
}

type ProductUpdateInput struct {
	Name           string  `json:"name"`
	CategoryID     *string `json:"category_id"`
	SupplierID     *string `json:"supplier_id"`
	ManufacturerID *string `json:"manufacturer_id"`
	TaxGroupID     *string `json:"tax_group_id"`
	NCMID          *string `json:"ncm_id"`
	CESTID         *string `json:"cest_id"`
	FiscalOrigin   *string `json:"fiscal_origin"`

	// NOVOS
	VideoLink  *string `json:"video_link"`
	OtherLinks *string `json:"other_links"`
}

// =====================
// WIZARD PAYLOAD (NOVO)
// =====================

// OBS: no payload do front você está mandando "isPrimary" (camelCase),
// então a tag tem que ser exatamente essa.
type VariationImageInput struct {
	ID          string `json:"id,omitempty"` // pode vir vazio
	URL         string `json:"url"`
	IsPrimary   bool   `json:"isPrimary,omitempty"`
	Position    *int   `json:"position,omitempty"`    // opcional
	Description string `json:"description,omitempty"` // opcional
}

// Details no seu front é um objeto livre { chave: valor }
// então aqui deve ser map direto.
// (Seu VariationDetailsInput antigo com Fields não bate com o payload.)
type VariationDetailsInput map[string]string

type VariationRowInput struct {
	SKU       string  `json:"sku"`                  // obrigatório
	EAN       *string `json:"ean,omitempty"`        // pode ser null
	Price     any     `json:"price,omitempty"`      // string | number | null
	CostPrice any     `json:"cost_price,omitempty"` // string | number | null

	Weight any `json:"weight,omitempty"`
	Length any `json:"length,omitempty"`
	Height any `json:"height,omitempty"`
	Width  any `json:"width,omitempty"`

	Active    *bool `json:"active,omitempty"`
	IsDefault *bool `json:"is_default,omitempty"`

	Combination *string               `json:"combination,omitempty"` // pode ser null
	Details     VariationDetailsInput `json:"details,omitempty"`     // objeto livre
	Images      []VariationImageInput `json:"images,omitempty"`
}

type ProductWizardInput struct {
	// produto “pai”
	Name string `json:"name"`

	CategoryID     *string `json:"category_id"`
	SupplierID     *string `json:"supplier_id"`
	ManufacturerID *string `json:"manufacturer_id"`

	// Tributação
	TaxGroupID   *string `json:"tax_group_id"`
	NCMID        *string `json:"ncm_id"`
	CESTID       *string `json:"cest_id"`
	FiscalOrigin *string `json:"fiscal_origin"`

	// Links
	VideoLink  *string `json:"video_link"`
	OtherLinks *string `json:"other_links"`

	// ✅ novo modelo: sempre vem pelo menos 1 variação (inclui default)
	Variations []VariationRowInput `json:"variations"`
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

	// NOVO
	mux.HandleFunc("/products/wizard", h.handleWizardCreate)
	mux.HandleFunc("/products/wizard/", h.handleWizardUpdate)

	mux.HandleFunc("/products/by-code", h.handleProductByCode)
	mux.HandleFunc("/products/duplicate/", h.handleDuplicateProduct)
}

func (h *ProductHandler) handleWizardCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}
	h.CreateProductWizard(w, r)
}

func (h *ProductHandler) handleWizardUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/products/wizard/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}
	h.UpdateProductWizard(w, r, id)
}

// Decide o que fazer dependendo do método HTTP
func (h *ProductHandler) handleProducts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
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
		h.UpdateProductWizard(w, r, id)
	case http.MethodDelete:
		h.DeleteProduct(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// CreateProduct godoc
// @Summary     Cria produto
// @Description Cria um novo produto para o tenant, gerando code PROD### automaticamente
// @Tags        Products
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       body body ProductCreateInput true "Dados do produto (name obrigatório)"
// @Success     201 {object} Product
// @Failure     400 {string} string "Erro de validação / JSON inválido / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products [post]
// ============================================================
// POST /products
// ============================================================
func (h *ProductHandler) CreateProductWizard(w http.ResponseWriter, r *http.Request) {
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

	// 3) decode
	var in ProductWizardInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	// 4) validações do novo modelo
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	// ✅ NOVO: se não veio variações, cria uma DEFAULT automaticamente
	// Regra: produto simples = 1 variação DEFAULT (is_default=true)
	if len(in.Variations) == 0 {
		http.Error(w, "variations é obrigatório (envie 1 variação DEFAULT para produto simples)", http.StatusBadRequest)
		return
	}

	// detecta se tem variações reais (grade)
	hasReal := false
	for _, v := range in.Variations {
		comb := ""
		if v.Combination != nil {
			comb = strings.TrimSpace(*v.Combination)
		}
		if strings.ToUpper(comb) != "" && strings.ToUpper(comb) != "DEFAULT" {
			hasReal = true
			break
		}
	}

	// se tem grade, remove qualquer DEFAULT enviada por engano
	if hasReal {
		filtered := make([]VariationRowInput, 0, len(in.Variations))
		for _, v := range in.Variations {
			comb := ""
			if v.Combination != nil {
				comb = strings.TrimSpace(*v.Combination)
			}
			if strings.ToUpper(comb) == "DEFAULT" {
				continue
			}
			filtered = append(filtered, v)
		}
		in.Variations = filtered

		if len(in.Variations) == 0 {
			http.Error(w, "grade inválida: envie pelo menos 1 variação real", http.StatusBadRequest)
			return
		}
	} else {
		// produto simples: força DEFAULT
		for i := range in.Variations {
			comb := "DEFAULT"
			in.Variations[i].Combination = &comb
		}
	}

	// ✅ Detecta se é “grade” (tem alguma combination diferente de DEFAULT)
	hasRealVariations := false
	for i := range in.Variations {
		comb := ""
		if in.Variations[i].Combination != nil {
			comb = strings.TrimSpace(*in.Variations[i].Combination)
		}
		if comb != "" && strings.ToUpper(comb) != "DEFAULT" {
			hasRealVariations = true
			break
		}
	}

	// ✅ Se tem variações reais (grade), remove qualquer DEFAULT enviada por engano
	if hasRealVariations {
		filtered := make([]VariationRowInput, 0, len(in.Variations))
		for _, v := range in.Variations {
			comb := ""
			if v.Combination != nil {
				comb = strings.TrimSpace(*v.Combination)
			}
			if strings.ToUpper(comb) == "DEFAULT" {
				continue
			}
			filtered = append(filtered, v)
		}
		in.Variations = filtered

		// segurança: não pode ficar vazio depois de filtrar
		if len(in.Variations) == 0 {
			http.Error(w, "grade de variações inválida (nenhuma variação real informada)", http.StatusBadRequest)
			return
		}
	} else {
		// ✅ Se NÃO tem variações reais, garante que a única variação seja DEFAULT
		for i := range in.Variations {
			comb := "DEFAULT"
			in.Variations[i].Combination = &comb
		}
	}

	// valida SKU de cada variação + conta defaults
	defaultCount := 0
	for i := range in.Variations {
		row := &in.Variations[i]
		if strings.TrimSpace(row.SKU) == "" {
			http.Error(w, "toda variação precisa de sku", http.StatusBadRequest)
			return
		}
		if row.IsDefault != nil && *row.IsDefault {
			defaultCount++
		}
	}

	// garante 1 default:
	// - se não veio nenhum default: marca a primeira como default
	// - se veio mais de 1 default: erro
	if defaultCount == 0 {
		tr := true
		in.Variations[0].IsDefault = &tr
	} else if defaultCount > 1 {
		http.Error(w, "apenas uma variação pode ser default", http.StatusBadRequest)
		return
	}

	// fiscal origin default
	fo := "0"
	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
		fo = strings.TrimSpace(*in.FiscalOrigin)
	}

	// ids/código
	productID := uuid.NewString()
	nextCode, err := h.generateNextProductCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ✅ Se você decidiu gerar SKU automático quando não veio:
	// (descomente se quiser permitir SKU vazio no topo)
	/*
		if !hasRealVariations && len(in.Variations) == 1 && strings.TrimSpace(in.Variations[0].SKU) == "" {
			in.Variations[0].SKU = nextCode
		}
	*/

	// tx
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1) salva PRODUCTS (pai)
	_, err = tx.Exec(`
		insert into products (
			id, tenant_id, code, name,
			category_id, supplier_id, manufacturer_id,
			tax_group_id, ncm_id, cest_id, fiscal_origin,
			video_link, other_links
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`,
		productID, tenantID, nextCode, strings.TrimSpace(in.Name),
		in.CategoryID, in.SupplierID, in.ManufacturerID,
		in.TaxGroupID, in.NCMID, in.CESTID, fo,
		in.VideoLink, in.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2) salva VARIAÇÕES
	for _, row := range in.Variations {
		varID := uuid.NewString()

		active := true
		if row.Active != nil {
			active = *row.Active
		}

		isDefault := false
		if row.IsDefault != nil {
			isDefault = *row.IsDefault
		}

		comb := "DEFAULT"
		if row.Combination != nil && strings.TrimSpace(*row.Combination) != "" {
			comb = strings.TrimSpace(*row.Combination)
		}

		_, err = tx.Exec(`
			insert into product_variations (
				id, tenant_id, product_id,
				combination, sku, ean,
				price, cost_price,
				weight, length, height, width,
				active, is_default,
				details
			) values (
				$1,$2,$3,
				$4,$5,$6,
				$7,$8,
				$9,$10,$11,$12,
				$13,$14,
				$15::jsonb
			)
		`,
			varID, tenantID, productID,
			comb,
			strings.TrimSpace(row.SKU),
			nullIfEmptyPtr(row.EAN),
			parseMoneyAny(row.Price),
			parseMoneyAny(row.CostPrice),
			parseDecimalAny(row.Weight),
			parseDecimalAny(row.Length),
			parseDecimalAny(row.Height),
			parseDecimalAny(row.Width),
			active, isDefault,
			mustJSON(row.Details),
		)
		if err != nil {
			http.Error(w, "erro ao salvar variação: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// imagens por variação
		if len(row.Images) > 0 {
			if err := insertVariationImagesTX(tx, tenantID, varID, row.Images); err != nil {
				http.Error(w, "erro ao salvar imagens da variação: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	// commit
	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao commit: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := Product{
		ID:             productID,
		TenantID:       tenantID,
		Code:           nextCode,
		Name:           in.Name,
		CategoryID:     in.CategoryID,
		SupplierID:     in.SupplierID,
		ManufacturerID: in.ManufacturerID,
		TaxGroupID:     in.TaxGroupID,
		NCMID:          in.NCMID,
		CESTID:         in.CESTID,
		FiscalOrigin:   fo,
		VideoLink:      in.VideoLink,
		OtherLinks:     in.OtherLinks,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

// UpdateProduct godoc
// @Summary     Atualiza produto
// @Description Atualiza os dados de um produto pelo ID dentro do tenant
// @Tags        Products
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID do produto"
// @Param       body body ProductUpdateInput true "Dados para atualização (name obrigatório)"
// @Success     200 {object} Product
// @Failure     400 {string} string "Erro de validação / JSON inválido / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Produto não encontrado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products/{id} [put]
func (h *ProductHandler) UpdateProductWizard(w http.ResponseWriter, r *http.Request, productID string) {
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

	var in ProductWizardInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	fo := "0"
	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
		fo = strings.TrimSpace(*in.FiscalOrigin)
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1) atualiza products
	res, err := tx.Exec(`
		update products
		   set name            = $1,
			   category_id      = $2,
			   supplier_id      = $3,
			   manufacturer_id  = $4,
			   tax_group_id     = $5,
			   ncm_id           = $6,
			   cest_id          = $7,
			   fiscal_origin    = $8,
			   video_link       = $9,
			   other_links      = $10
		 where id = $11 and tenant_id = $12
	`,
		strings.TrimSpace(in.Name),
		in.CategoryID, in.SupplierID, in.ManufacturerID,
		in.TaxGroupID, in.NCMID, in.CESTID, fo,
		in.VideoLink, in.OtherLinks,
		productID, tenantID,
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

	hasRealVariations := len(in.Variations) > 0

	if hasRealVariations {
		// 2A) se virou variável: remove DEFAULT (se existir)
		_, _ = tx.Exec(`
			delete from product_variations
			 where tenant_id=$1 and product_id=$2 and combination='DEFAULT'
		`, tenantID, productID)

		// remove TODAS as variações atuais (mais simples no começo)
		// depois podemos evoluir para diff incremental
		_, err = tx.Exec(`
			delete from product_variations
			 where tenant_id=$1 and product_id=$2
		`, tenantID, productID)
		if err != nil {
			http.Error(w, "erro ao limpar variações: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// recria as variações do payload
		for _, row := range in.Variations {
			if strings.TrimSpace(row.SKU) == "" {
				http.Error(w, "toda variação precisa de sku", http.StatusBadRequest)
				return
			}

			varID := uuid.NewString()
			active := true
			if row.Active != nil {
				active = *row.Active
			}

			comb := ""
			if row.Combination != nil {
				comb = strings.TrimSpace(*row.Combination)
			}

			_, err = tx.Exec(`
				insert into product_variations (
					id, tenant_id, product_id,
					combination, sku, ean,
					price, active,
					details
				) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
			`,
				varID, tenantID, productID,
				comb,
				strings.TrimSpace(row.SKU),
				nullIfEmptyPtr(row.EAN),
				parseMoneyAny(row.Price),
				active,
				mustJSON(row.Details),
			)
			if err != nil {
				http.Error(w, "erro ao salvar variação: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if len(row.Images) > 0 {
				if err := insertVariationImagesTX(tx, tenantID, varID, row.Images); err != nil {
					http.Error(w, "erro ao salvar imagens da variação: "+err.Error(), http.StatusInternalServerError)
					return
				}
			}
		}
	} else {
		// 2B) sem variações: manter variação DEFAULT existente ou não fazer nada
		// A regra agora é: sempre vem variations[] no ProductWizardInput
		// Se veio vazio, a validação no início deveria ter rejeitado
		// Mas para segurança, apenas deletamos as não-DEFAULT
		_, _ = tx.Exec(`
			delete from product_variations
			 where tenant_id=$1 and product_id=$2 and combination != 'DEFAULT'
		`, tenantID, productID)
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao commit: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// // ============================================================
// // POST /products
// // Front manda: { "name": "Produto X" }
// // ============================================================

// func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
// 	defer r.Body.Close()

// 	if _, err := RequireSession(h.DB, r); err != nil {
// 		http.Error(w, err.Error(), http.StatusUnauthorized)
// 		return
// 	}

// 	tenantID, err := GetTenantIDFromHeader(r)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusBadRequest)
// 		return
// 	}

// 	var in ProductCreateInput
// 	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
// 		http.Error(w, "JSON inválido", http.StatusBadRequest)
// 		return
// 	}

// 	if strings.TrimSpace(in.Name) == "" {
// 		http.Error(w, "name é obrigatório", http.StatusBadRequest)
// 		return
// 	}

// 	id := uuid.NewString()

// 	nextCode, err := h.generateNextProductCode(tenantID)
// 	if err != nil {
// 		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	fo := "0"
// 	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
// 		fo = strings.TrimSpace(*in.FiscalOrigin)
// 	}

// 	_, err = h.DB.Exec(`
// 		insert into products (
// 			id,
// 			tenant_id,
// 			code,
// 			name,
// 			category_id,
// 			supplier_id,
// 			manufacturer_id,
// 			tax_group_id,
// 			ncm_id,
// 			cest_id,
// 			fiscal_origin,
// 			video_link,
// 			other_links
// 		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
// 	`,
// 		id,
// 		tenantID,
// 		nextCode,
// 		in.Name,
// 		in.CategoryID,
// 		in.SupplierID,
// 		in.ManufacturerID,
// 		in.TaxGroupID,
// 		in.NCMID,
// 		in.CESTID,
// 		fo,
// 		in.VideoLink,  // <- NOVO (nullable)
// 		in.OtherLinks, // <- NOVO (nullable)
// 	)

// 	if err != nil {
// 		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	prod := Product{
// 		ID:             id,
// 		TenantID:       tenantID,
// 		Code:           nextCode,
// 		Name:           in.Name,
// 		CategoryID:     in.CategoryID,
// 		SupplierID:     in.SupplierID,
// 		ManufacturerID: in.ManufacturerID,
// 		TaxGroupID:     in.TaxGroupID,
// 		NCMID:          in.NCMID,
// 		CESTID:         in.CESTID,
// 		FiscalOrigin:   fo,
// 		VideoLink:      in.VideoLink,  // <- NOVO
// 		OtherLinks:     in.OtherLinks, // <- NOVO
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusCreated)
// 	_ = json.NewEncoder(w).Encode(prod)
// }

// ============================================================
// GET /products
// ============================================================

// ListProducts godoc
// @Summary     Lista produtos
// @Description Retorna todos os produtos do tenant ordenados por nome
// @Tags        Products
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Success     200 {array} Product
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products [get]
// ============================================================
// GET /products
// ============================================================
func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

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
			category_id,
			supplier_id,
			manufacturer_id,
			tax_group_id,
			ncm_id,
			cest_id,
			fiscal_origin,
			video_link,
			other_links
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
	productIDs := make([]string, 0)

	for rows.Next() {
		var (
			p              Product
			categoryID     sql.NullString
			supplierID     sql.NullString
			manufacturerID sql.NullString
			taxGroupID     sql.NullString
			ncmID          sql.NullString
			cestID         sql.NullString
			fiscalOrigin   string
			videoLink      sql.NullString
			otherLinks     sql.NullString
		)

		if err := rows.Scan(
			&p.ID,
			&p.TenantID,
			&p.Code,
			&p.Name,
			&categoryID,
			&supplierID,
			&manufacturerID,
			&taxGroupID,
			&ncmID,
			&cestID,
			&fiscalOrigin,
			&videoLink,
			&otherLinks,
		); err != nil {
			http.Error(w, "erro ao ler produtos: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if categoryID.Valid {
			v := categoryID.String
			p.CategoryID = &v
		}
		if supplierID.Valid {
			v := supplierID.String
			p.SupplierID = &v
		}
		if manufacturerID.Valid {
			v := manufacturerID.String
			p.ManufacturerID = &v
		}
		if taxGroupID.Valid {
			v := taxGroupID.String
			p.TaxGroupID = &v
		}
		if ncmID.Valid {
			v := ncmID.String
			p.NCMID = &v
		}
		if cestID.Valid {
			v := cestID.String
			p.CESTID = &v
		}

		p.FiscalOrigin = fiscalOrigin

		if videoLink.Valid {
			v := videoLink.String
			p.VideoLink = &v
		}
		if otherLinks.Valid {
			v := otherLinks.String
			p.OtherLinks = &v
		}

		// ✅ garante que sempre vem array no JSON (mesmo vazio)
		p.Variations = make([]ProductVariation, 0)

		products = append(products, p)
		productIDs = append(productIDs, p.ID)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar produtos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ✅ Busca variações em UMA query (sem N+1)
	// ✅ Busca variações em UMA query (sem N+1)
	if len(productIDs) > 0 {
		varRows, err := h.DB.Query(`
		select
			id,
			product_id,
			combination,
			is_default,
			sku,
			ean,
			active,
			details
		from product_variations
		where tenant_id = $1
		  and product_id = any($2)
		order by product_id asc, is_default desc, combination asc
	`, tenantID, pq.Array(productIDs))

		if err != nil {
			http.Error(w, "erro ao listar variações: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer varRows.Close()

		indexByProductID := make(map[string]int, len(products))
		for i := range products {
			indexByProductID[products[i].ID] = i
		}

		for varRows.Next() {
			var (
				v            ProductVariation
				ean          sql.NullString
				detailsBytes []byte
			)

			if err := varRows.Scan(
				&v.ID,
				&v.ProductID,
				&v.Combination,
				&v.IsDefault,
				&v.SKU,
				&ean,
				&v.Active,
				&detailsBytes,
			); err != nil {
				http.Error(w, "erro ao ler variações: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if ean.Valid {
				s := ean.String
				v.EAN = &s
			}

			if len(detailsBytes) > 0 {
				_ = json.Unmarshal(detailsBytes, &v.Details)
			}

			if idx, ok := indexByProductID[v.ProductID]; ok {
				products[idx].Variations = append(products[idx].Variations, v)
			}
		}

		if err := varRows.Err(); err != nil {
			http.Error(w, "erro ao iterar variações: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(products)
}

// ============================================================
// GET /products/{id}
// ============================================================

// GetProductByID godoc
// @Summary     Busca produto por ID
// @Description Retorna um produto específico pelo ID dentro do tenant
// @Tags        Products
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID do produto"
// @Success     200 {object} Product
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Produto não encontrado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products/{id} [get]
func (h *ProductHandler) GetProductByID(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	tenantID, err := GetTenantIDFromHeader(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var (
		p              Product
		categoryID     sql.NullString
		supplierID     sql.NullString
		manufacturerID sql.NullString
		taxGroupID     sql.NullString
		ncmID          sql.NullString
		cestID         sql.NullString
		fiscalOrigin   string
		videoLink      sql.NullString
		otherLinks     sql.NullString
	)

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			category_id,
			supplier_id,
			manufacturer_id,
			tax_group_id,
			ncm_id,
			cest_id,
			fiscal_origin,
			video_link,
			other_links
		from products
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&categoryID,
		&supplierID,
		&manufacturerID,
		&taxGroupID,
		&ncmID,
		&cestID,
		&fiscalOrigin,
		&videoLink,
		&otherLinks,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if categoryID.Valid {
		v := categoryID.String
		p.CategoryID = &v
	}
	if supplierID.Valid {
		v := supplierID.String
		p.SupplierID = &v
	}
	if manufacturerID.Valid {
		v := manufacturerID.String
		p.ManufacturerID = &v
	}
	if taxGroupID.Valid {
		v := taxGroupID.String
		p.TaxGroupID = &v
	}
	if ncmID.Valid {
		v := ncmID.String
		p.NCMID = &v
	}
	if cestID.Valid {
		v := cestID.String
		p.CESTID = &v
	}

	p.FiscalOrigin = fiscalOrigin

	if videoLink.Valid {
		v := videoLink.String
		p.VideoLink = &v
	}
	if otherLinks.Valid {
		v := otherLinks.String
		p.OtherLinks = &v
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

// func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request, id string) {
// 	defer r.Body.Close()

// 	if _, err := RequireSession(h.DB, r); err != nil {
// 		http.Error(w, err.Error(), http.StatusUnauthorized)
// 		return
// 	}

// 	tenantID, err := GetTenantIDFromHeader(r)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusBadRequest)
// 		return
// 	}

// 	var in ProductUpdateInput
// 	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
// 		http.Error(w, "JSON inválido", http.StatusBadRequest)
// 		return
// 	}

// 	if strings.TrimSpace(in.Name) == "" {
// 		http.Error(w, "name é obrigatório", http.StatusBadRequest)
// 		return
// 	}

// 	fo := "0"
// 	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
// 		fo = strings.TrimSpace(*in.FiscalOrigin)
// 	}

// 	res, err := h.DB.Exec(`
// 		update products
// 		set name            = $1,
// 			category_id      = $2,
// 			supplier_id      = $3,
// 			manufacturer_id  = $4,
// 			tax_group_id     = $5,
// 			ncm_id           = $6,
// 			cest_id          = $7,
// 			fiscal_origin    = $8,
// 			video_link       = $9,
// 			other_links      = $10
// 		where id        = $11
// 		  and tenant_id = $12
// 	`,
// 		in.Name,
// 		in.CategoryID,
// 		in.SupplierID,
// 		in.ManufacturerID,
// 		in.TaxGroupID,
// 		in.NCMID,
// 		in.CESTID,
// 		fo,
// 		in.VideoLink,  // <- NOVO
// 		in.OtherLinks, // <- NOVO
// 		id,
// 		tenantID,
// 	)
// 	if err != nil {
// 		http.Error(w, "erro ao atualizar produto: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	aff, _ := res.RowsAffected()
// 	if aff == 0 {
// 		http.Error(w, "produto não encontrado", http.StatusNotFound)
// 		return
// 	}

// 	// retorna o produto completo (consistente com os outros GETs)
// 	var (
// 		p              Product
// 		categoryID     sql.NullString
// 		supplierID     sql.NullString
// 		manufacturerID sql.NullString
// 		taxGroupID     sql.NullString
// 		ncmID          sql.NullString
// 		cestID         sql.NullString
// 		fiscalOrigin   string
// 		videoLink      sql.NullString
// 		otherLinks     sql.NullString
// 	)

// 	err = h.DB.QueryRow(`
// 		select
// 			id,
// 			tenant_id,
// 			code,
// 			name,
// 			category_id,
// 			supplier_id,
// 			manufacturer_id,
// 			tax_group_id,
// 			ncm_id,
// 			cest_id,
// 			fiscal_origin,
// 			video_link,
// 			other_links
// 		from products
// 		where id = $1
// 		  and tenant_id = $2
// 	`, id, tenantID).Scan(
// 		&p.ID,
// 		&p.TenantID,
// 		&p.Code,
// 		&p.Name,
// 		&categoryID,
// 		&supplierID,
// 		&manufacturerID,
// 		&taxGroupID,
// 		&ncmID,
// 		&cestID,
// 		&fiscalOrigin,
// 		&videoLink,
// 		&otherLinks,
// 	)
// 	if err != nil {
// 		http.Error(w, "erro ao buscar produto atualizado: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	if categoryID.Valid {
// 		v := categoryID.String
// 		p.CategoryID = &v
// 	}
// 	if supplierID.Valid {
// 		v := supplierID.String
// 		p.SupplierID = &v
// 	}
// 	if manufacturerID.Valid {
// 		v := manufacturerID.String
// 		p.ManufacturerID = &v
// 	}
// 	if taxGroupID.Valid {
// 		v := taxGroupID.String
// 		p.TaxGroupID = &v
// 	}
// 	if ncmID.Valid {
// 		v := ncmID.String
// 		p.NCMID = &v
// 	}
// 	if cestID.Valid {
// 		v := cestID.String
// 		p.CESTID = &v
// 	}

// 	p.FiscalOrigin = fiscalOrigin

// 	if videoLink.Valid {
// 		v := videoLink.String
// 		p.VideoLink = &v
// 	}
// 	if otherLinks.Valid {
// 		v := otherLinks.String
// 		p.OtherLinks = &v
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	_ = json.NewEncoder(w).Encode(p)
// }

// ============================================================
// DELETE /products/{id}
// ============================================================

// DeleteProduct godoc
// @Summary     Exclui produto
// @Description Remove um produto pelo ID dentro do tenant
// @Tags        Products
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID do produto"
// @Success     204 {string} string "Sem conteúdo"
// @Failure     400 {string} string "Tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Produto não encontrado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products/{id} [delete]
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

	ctx := r.Context()

	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		http.Error(w, "erro ao iniciar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer func() {
		_ = tx.Rollback() // no-op se já commitou
	}()

	// 3) remove vínculos de promoções (somente do mesmo tenant)
	// Ajuste o JOIN conforme o seu schema:
	// - promotion_products(pp): promotion_id, product_id
	// - promotions(p): id, tenant_id
	_, err = tx.ExecContext(ctx, `
		DELETE FROM promotion_products pp
		USING promotions p
		WHERE pp.promotion_id = p.id
		  AND p.tenant_id = $1
		  AND pp.product_id = $2
	`, tenantID, id)
	if err != nil {
		http.Error(w, "erro ao remover vínculos de promoções: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 4) agora pode excluir o produto
	res, err := tx.ExecContext(ctx, `
		DELETE FROM products
		WHERE id = $1
		  AND tenant_id = $2
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

	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao finalizar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ============================================================
// GET /products/by-code?code=PROD001
// ============================================================

// GetProductByCode godoc
// @Summary     Busca produto por código
// @Description Retorna um produto pelo código (ex: PROD001) dentro do tenant
// @Tags        Products
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       code query string true "Código do produto (ex: PROD001)"
// @Success     200 {object} Product
// @Failure     400 {string} string "Parâmetro code obrigatório / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Produto não encontrado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products/by-code [get]
func (h *ProductHandler) handleProductByCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

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

	var (
		p              Product
		categoryID     sql.NullString
		supplierID     sql.NullString
		manufacturerID sql.NullString
		taxGroupID     sql.NullString
		ncmID          sql.NullString
		cestID         sql.NullString
		fiscalOrigin   string
		videoLink      sql.NullString
		otherLinks     sql.NullString
	)

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			category_id,
			supplier_id,
			manufacturer_id,
			tax_group_id,
			ncm_id,
			cest_id,
			fiscal_origin,
			video_link,
			other_links
		from products
		where code = $1
		  and tenant_id = $2
	`, code, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&categoryID,
		&supplierID,
		&manufacturerID,
		&taxGroupID,
		&ncmID,
		&cestID,
		&fiscalOrigin,
		&videoLink,
		&otherLinks,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if categoryID.Valid {
		v := categoryID.String
		p.CategoryID = &v
	}
	if supplierID.Valid {
		v := supplierID.String
		p.SupplierID = &v
	}
	if manufacturerID.Valid {
		v := manufacturerID.String
		p.ManufacturerID = &v
	}
	if taxGroupID.Valid {
		v := taxGroupID.String
		p.TaxGroupID = &v
	}
	if ncmID.Valid {
		v := ncmID.String
		p.NCMID = &v
	}
	if cestID.Valid {
		v := cestID.String
		p.CESTID = &v
	}

	p.FiscalOrigin = fiscalOrigin

	if videoLink.Valid {
		v := videoLink.String
		p.VideoLink = &v
	}
	if otherLinks.Valid {
		v := otherLinks.String
		p.OtherLinks = &v
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

// ============================================================
// POST /products/duplicate/{id}
// Duplicação simples, copiando só name e gerando novo code
// ============================================================

// DuplicateProduct godoc
// @Summary     Duplica produto
// @Description Duplica um produto pelo ID, gerando novo ID e novo code PROD###
// @Tags        Products
// @Produce     json
// @Param       Authorization header string true "Bearer <token>"
// @Param       X-Tenant-ID header string true "Tenant ID"
// @Param       id path string true "ID do produto a duplicar"
// @Success     201 {object} Product
// @Failure     400 {string} string "ID não informado / tenant inválido"
// @Failure     401 {string} string "Não autenticado"
// @Failure     404 {string} string "Produto não encontrado"
// @Failure     500 {string} string "Erro interno"
// @Router      /products/duplicate/{id} [post]
func (h *ProductHandler) handleDuplicateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}

	if _, err := RequireSession(h.DB, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

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

	var (
		original       Product
		categoryID     sql.NullString
		supplierID     sql.NullString
		manufacturerID sql.NullString
		taxGroupID     sql.NullString
		ncmID          sql.NullString
		cestID         sql.NullString
		fiscalOrigin   string
		videoLink      sql.NullString
		otherLinks     sql.NullString
	)

	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			code,
			name,
			category_id,
			supplier_id,
			manufacturer_id,
			tax_group_id,
			ncm_id,
			cest_id,
			fiscal_origin,
			video_link,
			other_links
		from products
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&original.ID,
		&original.TenantID,
		&original.Code,
		&original.Name,
		&categoryID,
		&supplierID,
		&manufacturerID,
		&taxGroupID,
		&ncmID,
		&cestID,
		&fiscalOrigin,
		&videoLink,
		&otherLinks,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if categoryID.Valid {
		v := categoryID.String
		original.CategoryID = &v
	}
	if supplierID.Valid {
		v := supplierID.String
		original.SupplierID = &v
	}
	if manufacturerID.Valid {
		v := manufacturerID.String
		original.ManufacturerID = &v
	}
	if taxGroupID.Valid {
		v := taxGroupID.String
		original.TaxGroupID = &v
	}
	if ncmID.Valid {
		v := ncmID.String
		original.NCMID = &v
	}
	if cestID.Valid {
		v := cestID.String
		original.CESTID = &v
	}
	original.FiscalOrigin = fiscalOrigin

	if videoLink.Valid {
		v := videoLink.String
		original.VideoLink = &v
	}
	if otherLinks.Valid {
		v := otherLinks.String
		original.OtherLinks = &v
	}

	newID := uuid.NewString()
	newCode, err := h.generateNextProductCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	newName := original.Name + " (Cópia)"

	_, err = h.DB.Exec(`
		insert into products (
			id,
			tenant_id,
			code,
			name,
			category_id,
			supplier_id,
			manufacturer_id,
			tax_group_id,
			ncm_id,
			cest_id,
			fiscal_origin,
			video_link,
			other_links
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`,
		newID,
		tenantID,
		newCode,
		newName,
		original.CategoryID,
		original.SupplierID,
		original.ManufacturerID,
		original.TaxGroupID,
		original.NCMID,
		original.CESTID,
		original.FiscalOrigin,
		original.VideoLink,
		original.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto copiado: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := Product{
		ID:             newID,
		TenantID:       tenantID,
		Code:           newCode,
		Name:           newName,
		CategoryID:     original.CategoryID,
		SupplierID:     original.SupplierID,
		ManufacturerID: original.ManufacturerID,
		TaxGroupID:     original.TaxGroupID,
		NCMID:          original.NCMID,
		CESTID:         original.CESTID,
		FiscalOrigin:   original.FiscalOrigin,
		VideoLink:      original.VideoLink,
		OtherLinks:     original.OtherLinks,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

func nullIfEmpty(s string) *string {
	ss := strings.TrimSpace(s)
	if ss == "" {
		return nil
	}
	return &ss
}

func nullIfEmptyPtr(s *string) *string {
	if s == nil {
		return nil
	}
	return nullIfEmpty(*s)
}

func mustJSON(m map[string]string) string {
	if m == nil {
		return "{}"
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// essas 2 funções assumem que a coluna é NUMERIC no banco
func anyToString(v any) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(val), 'f', -1, 64)
	case int:
		return strconv.Itoa(val)
	default:
		return ""
	}
}

func parseMoney(v string) *float64 {
	s := strings.TrimSpace(strings.ReplaceAll(v, ",", "."))
	if s == "" {
		return nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &f
}

func parseMoneyPtr(v *string) *float64 {
	if v == nil {
		return nil
	}
	return parseMoney(*v)
}

func parseMoneyAny(v any) *float64 {
	return parseMoney(anyToString(v))
}

func parseDecimalPtr(v *string) *float64 {
	// mesmo comportamento do money, só sem semântica de moeda
	return parseMoneyPtr(v)
}

func parseDecimalAny(v any) *float64 {
	return parseMoney(anyToString(v))
}

func insertVariationImagesTX(tx *sql.Tx, tenantID, variationID string, imgs []VariationImageInput) error {
	// regra: 1 primária no máximo (se vier mais, mantém a primeira)
	primarySeen := false

	for i, img := range imgs {
		if strings.TrimSpace(img.URL) == "" {
			continue
		}

		isPrimary := img.IsPrimary
		if isPrimary {
			if primarySeen {
				isPrimary = false
			}
			primarySeen = true
		}

		pos := img.Position
		if pos == nil || *pos == 0 {
			p := i + 1
			pos = &p
		}

		_, err := tx.Exec(`
			insert into product_variation_images (
				id, tenant_id, variation_id, url, is_primary, position
			) values ($1,$2,$3,$4,$5,$6)
		`,
			uuid.NewString(),
			tenantID,
			variationID,
			strings.TrimSpace(img.URL),
			isPrimary,
			pos,
		)
		if err != nil {
			return err
		}
	}

	return nil
}
