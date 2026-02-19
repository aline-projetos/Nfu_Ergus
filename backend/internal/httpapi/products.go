package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ============================================================
// MODELS
// ============================================================

type Product struct {
	ID       string `json:"id"`
	TenantID string `json:"tenant_id"`
	Code     string `json:"code"`
	Name     string `json:"name"`

	// Campos “pai” (agrupador)
	Reference        *string `json:"reference,omitempty"`
	Unit             *string `json:"unit,omitempty"`
	ShortDescription *string `json:"short_description,omitempty"`
	LongDescription  *string `json:"long_description,omitempty"`
	MetaTitle        *string `json:"meta_title,omitempty"`
	MetaTag          *string `json:"meta_tag,omitempty"`
	MetaDescription  *string `json:"meta_description,omitempty"`

	PromotionID    *string `json:"promotion_id,omitempty"`
	CategoryID     *string `json:"category_id,omitempty"`
	SupplierID     *string `json:"supplier_id,omitempty"`
	ManufacturerID *string `json:"manufacturer_id,omitempty"`

	TaxGroupID   *string `json:"tax_group_id,omitempty"`
	NCMID        *string `json:"ncm_id,omitempty"`
	CESTID       *string `json:"cest_id,omitempty"`
	FiscalOrigin string  `json:"fiscal_origin"`

	VideoLink  *string `json:"video_link,omitempty"`
	OtherLinks *string `json:"other_links,omitempty"`

	// Sempre pelo menos 1 variação (DEFAULT)
	Variations []ProductVariation `json:"variations"`
}

type ProductVariation struct {
	ID        string `json:"id"`
	ProductID string `json:"product_id"`
	TenantID  string `json:"tenant_id"`

	SKU string  `json:"sku"`
	EAN *string `json:"ean,omitempty"`

	Price     *string `json:"price,omitempty"`      // guardamos como texto normalizado ("10.99")
	CostPrice *string `json:"cost_price,omitempty"` // idem

	Weight *string `json:"weight,omitempty"`
	Length *string `json:"length,omitempty"`
	Height *string `json:"height,omitempty"`
	Width  *string `json:"width,omitempty"`

	Active    bool `json:"active"`
	IsDefault bool `json:"is_default"`

	Combination *string         `json:"combination,omitempty"` // ex: "Cor: Azul / Tamanho: M"
	Details     json.RawMessage `json:"details,omitempty"`     // JSONB livre (detalhes SEO por variação)

	Images []VariationImageOut `json:"images,omitempty"`
}

type VariationImageOut struct {
	ID        string  `json:"id"`
	URL       string  `json:"url"`
	IsPrimary bool    `json:"isPrimary"`
	Position  *int    `json:"position,omitempty"`
	Desc      *string `json:"description,omitempty"`
}

type VariationImageInput struct {
	ID          string `json:"id,omitempty"` // pode vir vazio
	URL         string `json:"url"`
	IsPrimary   bool   `json:"isPrimary,omitempty"`
	Position    *int   `json:"position,omitempty"`    // opcional
	Description string `json:"description,omitempty"` // opcional
}

type VariationRowInput struct {
	SKU string  `json:"sku"`           // obrigatório
	EAN *string `json:"ean,omitempty"` // pode ser null

	Price     any `json:"price,omitempty"`      // string | number | null (vindo do front)
	CostPrice any `json:"cost_price,omitempty"` // idem

	Weight any `json:"weight,omitempty"`
	Length any `json:"length,omitempty"`
	Height any `json:"height,omitempty"`
	Width  any `json:"width,omitempty"`

	Active    *bool `json:"active,omitempty"`
	IsDefault *bool `json:"is_default,omitempty"`

	Combination *string               `json:"combination,omitempty"` // pode ser null / "DEFAULT"
	Details     json.RawMessage       `json:"details,omitempty"`     // objeto livre (SEO da variação)
	Images      []VariationImageInput `json:"images,omitempty"`
}

type ProductWizardInput struct {
	// Produto “pai”
	Name string `json:"name"`

	Reference string  `json:"reference"`
	SKU       string  `json:"sku"`
	EAN       *string `json:"ean"`

	Price     any `json:"price,omitempty"`
	CostPrice any `json:"cost_price,omitempty"`
	Weight    any `json:"weight,omitempty"`
	Length    any `json:"length,omitempty"`
	Height    any `json:"height,omitempty"`
	Width     any `json:"width,omitempty"`

	Active *bool `json:"active,omitempty"`

	Unit             *string `json:"unit,omitempty"`
	ShortDescription *string `json:"short_description,omitempty"`
	LongDescription  *string `json:"long_description,omitempty"`
	MetaTitle        *string `json:"meta_title,omitempty"`
	MetaTag          *string `json:"meta_tag,omitempty"`
	MetaDescription  *string `json:"meta_description,omitempty"`

	PromotionID    *string `json:"promotion_id,omitempty"`
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

	// Imagens “padrão” do produto (vão para a variação default)
	DefaultImages []VariationImageInput `json:"default_images,omitempty"`

	// Regra: sempre precisa existir pelo menos 1 variação
	// - se não houver grade: enviar 1 variação (DEFAULT)
	// - se houver grade: enviar N variações
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

func (h *ProductHandler) lockProductCodeCounter(tx *sql.Tx, tenantID string) error {
	// lock por tenant, por “contador de produto”
	// hashtext retorna int32; usamos como chave do advisory lock
	_, err := tx.Exec(`select pg_advisory_xact_lock(hashtext($1))`, "products_code:"+tenantID)
	return err
}

func (h *ProductHandler) generateNextProductCodeTX(tx *sql.Tx, tenantID string) (string, error) {
	// 1) lock (serializa concorrência por tenant)
	if err := h.lockProductCodeCounter(tx, tenantID); err != nil {
		return "", fmt.Errorf("erro ao lockar contador: %w", err)
	}

	// 2) lê e trava a sequência do tenant
	var nextNum int
	err := tx.QueryRow(`
		select next_code
		  from tenant_product_sequences
		 where tenant_id = $1
		 for update
	`, tenantID).Scan(&nextNum)

	if err == sql.ErrNoRows {
		// Se não existe linha ainda, inicializa em 1
		nextNum = 1

		_, err2 := tx.Exec(`
			insert into tenant_product_sequences (tenant_id, next_code)
			values ($1, $2)
			on conflict (tenant_id) do nothing
		`, tenantID, nextNum)
		if err2 != nil {
			return "", fmt.Errorf("erro ao criar sequência do tenant: %w", err2)
		}

		// Releitura com FOR UPDATE pra garantir que está travado corretamente
		if err2 := tx.QueryRow(`
			select next_code
			  from tenant_product_sequences
			 where tenant_id = $1
			 for update
		`, tenantID).Scan(&nextNum); err2 != nil {
			return "", fmt.Errorf("erro ao reler sequência do tenant: %w", err2)
		}
	} else if err != nil {
		return "", fmt.Errorf("erro ao ler sequência do tenant: %w", err)
	}

	// 3) gera o código baseado no nextNum atual
	code := buildProdCode(nextNum)

	// 4) avança o ponteiro: next_code += 1
	_, err = tx.Exec(`
		update tenant_product_sequences
		   set next_code = next_code + 1
		 where tenant_id = $1
	`, tenantID)
	if err != nil {
		return "", fmt.Errorf("erro ao atualizar sequência do tenant: %w", err)
	}

	return code, nil
}

func buildProdCode(num int) string {
	return fmt.Sprintf("PROD%06d", num)
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
	log.Printf("[CreateProductWizard] default_images recebidas: %d", len(in.DefaultImages))

	// 4) validações do novo modelo
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	// Regra base: sempre precisa ter pelo menos 1 variação
	if len(in.Variations) == 0 {
		http.Error(w, "variations é obrigatório (envie 1 variação para produto simples ou N para grade)", http.StatusBadRequest)
		return
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

	if hasRealVariations {
		// ✅ CASO: PRODUTO COM GRADE
		// remove qualquer variação que venha marcada como "DEFAULT" por engano
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

		// 👉 regra de domínio: produto com grade NÃO tem variação default
		for i := range in.Variations {
			in.Variations[i].IsDefault = nil // ou ponteiro pra false, se preferir gravar explicitamente
		}

	} else {
		// ✅ CASO: PRODUTO SIMPLES
		// se não há combination "real", obrigatoriamente deve ser exatamente 1 variação
		if len(in.Variations) != 1 {
			http.Error(w, "produto simples deve ter exatamente 1 variação DEFAULT", http.StatusBadRequest)
			return
		}

		// garante combination = "DEFAULT"
		comb := "DEFAULT"
		in.Variations[0].Combination = &comb

		// garante is_default = true
		def := true
		in.Variations[0].IsDefault = &def

		// se quiser, aqui poderia garantir também que imagens estejam coerentes
		// (ex: se variação não tiver imagens, herdar de in.DefaultImages)
	}

	// valida SKU de cada variação (todas precisam ter sku)
	for i := range in.Variations {
		row := &in.Variations[i]
		if strings.TrimSpace(row.SKU) == "" {
			http.Error(w, "toda variação precisa de sku", http.StatusBadRequest)
			return
		}
	}

	// fiscal origin default
	fo := "0"
	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
		fo = strings.TrimSpace(*in.FiscalOrigin)
	}

	// ids
	productID := uuid.NewString()

	// tx
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	code, err := h.generateNextProductCodeTX(tx, tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do produto", http.StatusInternalServerError)
		return
	}

	// 5) salva PRODUCTS (pai)
	_, err = tx.Exec(`
		insert into products (
			id, tenant_id, code, name,
			category_id, supplier_id, manufacturer_id,
			tax_group_id, ncm_id, cest_id, fiscal_origin,
			video_link, other_links
		) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`,
		productID, tenantID, code, strings.TrimSpace(in.Name),
		in.CategoryID, in.SupplierID, in.ManufacturerID,
		in.TaxGroupID, in.NCMID, in.CESTID, fo,
		in.VideoLink, in.OtherLinks,
	)
	if err != nil {
		http.Error(w, "erro ao salvar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	parentImages := in.DefaultImages

	// 6) salva VARIAÇÕES (agora já com SKU/código corretos)
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

		priceVal, err := normalizeNumericField(row.Price)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo price inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		costVal, err := normalizeNumericField(row.CostPrice)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo cost_price inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		weightVal, err := normalizeNumericField(row.Weight)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo weight inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		lengthVal, err := normalizeNumericField(row.Length)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo length inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		heightVal, err := normalizeNumericField(row.Height)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo height inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		widthVal, err := normalizeNumericField(row.Width)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo width inválido: "+err.Error(), http.StatusBadRequest)
			return
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
			priceVal,
			costVal,
			weightVal,
			lengthVal,
			heightVal,
			widthVal,
			active, isDefault,
			mustJSONRaw(row.Details),
		)
		if err != nil {
			http.Error(w, "erro ao salvar variação: "+err.Error(), http.StatusInternalServerError)
			return
		}

		imgsToUse := row.Images
		if len(imgsToUse) == 0 {
			imgsToUse = parentImages
		}

		if len(imgsToUse) > 0 {
			if err := insertVariationImagesTX(tx, tenantID, varID, imgsToUse); err != nil {
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
		Code:           code,
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
	log.Printf("[UpdateProductWizard] default_images recebidas: %d", len(in.DefaultImages))

	// 4) validações do novo modelo
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	if len(in.Variations) == 0 {
		http.Error(w, "variations é obrigatório (envie 1 variação para produto simples ou N para grade)", http.StatusBadRequest)
		return
	}

	// Detecta se é “grade” (tem alguma combination diferente de DEFAULT)
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

	if hasRealVariations {
		// CASO: PRODUTO COM GRADE
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
			http.Error(w, "grade de variações inválida (nenhuma variação real informada)", http.StatusBadRequest)
			return
		}

		// produto com grade NÃO tem variação default
		for i := range in.Variations {
			in.Variations[i].IsDefault = nil
		}

	} else {
		// CASO: PRODUTO SIMPLES
		if len(in.Variations) != 1 {
			http.Error(w, "produto simples deve ter exatamente 1 variação DEFAULT", http.StatusBadRequest)
			return
		}

		comb := "DEFAULT"
		in.Variations[0].Combination = &comb

		def := true
		in.Variations[0].IsDefault = &def
	}

	// valida SKU de cada variação
	for i := range in.Variations {
		row := &in.Variations[i]
		if strings.TrimSpace(row.SKU) == "" {
			http.Error(w, "toda variação precisa de sku", http.StatusBadRequest)
			return
		}
	}

	// fiscal origin default
	fo := "0"
	if in.FiscalOrigin != nil && strings.TrimSpace(*in.FiscalOrigin) != "" {
		fo = strings.TrimSpace(*in.FiscalOrigin)
	}

	// 5) tx
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "erro ao iniciar transação: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 6) garante que o produto existe e pertence ao tenant
	var existingCode string
	err = tx.QueryRow(`
		select code
		  from products
		 where id = $1
		   and tenant_id = $2
	`, productID, tenantID).Scan(&existingCode)

	if err == sql.ErrNoRows {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao carregar produto: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 7) atualiza PRODUCTS (pai) — NÃO mexe no code
	_, err = tx.Exec(`
		update products
		   set name           = $1,
		       category_id     = $2,
		       supplier_id     = $3,
		       manufacturer_id = $4,
		       tax_group_id    = $5,
		       ncm_id          = $6,
		       cest_id         = $7,
		       fiscal_origin   = $8,
		       video_link      = $9,
		       other_links     = $10
		 where id = $11
		   and tenant_id = $12
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

	parentImages := in.DefaultImages

	// 8) trata variações de acordo com o tipo
	if !hasRealVariations {
		// PRODUTO SIMPLES: zera todas as variações e recria a única DEFAULT
		if _, err := tx.Exec(`
			delete from product_variations
			 where tenant_id = $1
			   and product_id = $2
		`, tenantID, productID); err != nil {
			http.Error(w, "erro ao limpar variações do produto simples: "+err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		// PRODUTO COM GRADE: remove apenas a variação default antiga (se existir)
		if _, err := tx.Exec(`
			delete from product_variations
			 where tenant_id = $1
			   and product_id = $2
			   and is_default = true
		`, tenantID, productID); err != nil {
			http.Error(w, "erro ao remover variação default antiga: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// 9) carrega variações existentes (pós-limpeza acima) para upsert por SKU
	existingBySKU := make(map[string]string) // sku -> id

	rows, err := tx.Query(`
		select id, sku
		  from product_variations
		 where tenant_id = $1
		   and product_id = $2
	`, tenantID, productID)
	if err != nil {
		http.Error(w, "erro ao carregar variações existentes: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, sku string
		if err := rows.Scan(&id, &sku); err != nil {
			http.Error(w, "erro ao ler variação existente: "+err.Error(), http.StatusInternalServerError)
			return
		}
		existingBySKU[sku] = id
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar variações existentes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 10) upsert de variações com base no payload
	for _, row := range in.Variations {
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

		priceVal, err := normalizeNumericField(row.Price)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo price inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		costVal, err := normalizeNumericField(row.CostPrice)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo cost_price inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		weightVal, err := normalizeNumericField(row.Weight)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo weight inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		lengthVal, err := normalizeNumericField(row.Length)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo length inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		heightVal, err := normalizeNumericField(row.Height)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo height inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		widthVal, err := normalizeNumericField(row.Width)
		if err != nil {
			http.Error(w, "variação com sku "+row.SKU+": campo width inválido: "+err.Error(), http.StatusBadRequest)
			return
		}

		skuTrimmed := strings.TrimSpace(row.SKU)
		if existingID, ok := existingBySKU[skuTrimmed]; ok {
			// UPDATE variação existente
			_, err = tx.Exec(`
				update product_variations
				   set combination      = $1,
					   ean             = $2,
					   price           = $3,
					   cost_price      = $4,
					   weight          = $5,
					   length          = $6,
					   height          = $7,
					   width           = $8,
					   active          = $9,
					   is_default      = $10,
					   details         = $11::jsonb
				 where id             = $12
				   and tenant_id       = $13
			`,
				comb,
				nullIfEmptyPtr(row.EAN),
				priceVal,
				costVal,
				weightVal,
				lengthVal,
				heightVal,
				widthVal,
				active,
				isDefault,
				mustJSONRaw(row.Details),
				existingID,
				tenantID,
			)
			if err != nil {
				http.Error(w, "erro ao atualizar variação: "+err.Error(), http.StatusInternalServerError)
				return
			}

			// imagens
			imgsToUse := row.Images
			if len(imgsToUse) == 0 {
				imgsToUse = parentImages
			}
			if len(imgsToUse) > 0 {
				if err := insertVariationImagesTX(tx, tenantID, existingID, imgsToUse); err != nil {
					http.Error(w, "erro ao salvar imagens da variação: "+err.Error(), http.StatusInternalServerError)
					return
				}
			}

		} else {
			// INSERT nova variação
			varID := uuid.NewString()

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
				skuTrimmed,
				nullIfEmptyPtr(row.EAN),
				priceVal,
				costVal,
				weightVal,
				lengthVal,
				heightVal,
				widthVal,
				active, isDefault,
				mustJSONRaw(row.Details),
			)
			if err != nil {
				http.Error(w, "erro ao salvar variação: "+err.Error(), http.StatusInternalServerError)
				return
			}

			imgsToUse := row.Images
			if len(imgsToUse) == 0 {
				imgsToUse = parentImages
			}
			if len(imgsToUse) > 0 {
				if err := insertVariationImagesTX(tx, tenantID, varID, imgsToUse); err != nil {
					http.Error(w, "erro ao salvar imagens da variação: "+err.Error(), http.StatusInternalServerError)
					return
				}
			}
		}
	}

	// 11) commit
	if err := tx.Commit(); err != nil {
		http.Error(w, "erro ao commit: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Monta resposta básica
	out := Product{
		ID:             productID,
		TenantID:       tenantID,
		Code:           existingCode,
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
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(out)
}

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

	// 1) busca o produto (pai)
	var out Product

	var (
		categoryID     sql.NullString
		supplierID     sql.NullString
		manufacturerID sql.NullString
		taxGroupID     sql.NullString
		ncmID          sql.NullString
		cestID         sql.NullString
		videoLink      sql.NullString
		otherLinks     sql.NullString
		fiscalOrigin   sql.NullString
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
		&out.ID,
		&out.TenantID,
		&out.Code,
		&out.Name,
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
		out.CategoryID = &v
	}
	if supplierID.Valid {
		v := supplierID.String
		out.SupplierID = &v
	}
	if manufacturerID.Valid {
		v := manufacturerID.String
		out.ManufacturerID = &v
	}
	if taxGroupID.Valid {
		v := taxGroupID.String
		out.TaxGroupID = &v
	}
	if ncmID.Valid {
		v := ncmID.String
		out.NCMID = &v
	}
	if cestID.Valid {
		v := cestID.String
		out.CESTID = &v
	}

	// fiscal_origin é obrigatório no seu fluxo; mas trato nulo por segurança
	if fiscalOrigin.Valid && fiscalOrigin.String != "" {
		out.FiscalOrigin = fiscalOrigin.String
	} else {
		out.FiscalOrigin = "0"
	}

	if videoLink.Valid {
		v := videoLink.String
		out.VideoLink = &v
	}
	if otherLinks.Valid {
		v := otherLinks.String
		out.OtherLinks = &v
	}

	// 2) busca variações
	rows, err := h.DB.Query(`
		select
			id,
			product_id,
			combination,
			sku,
			ean,
			price,
			cost_price,
			weight,
			length,
			height,
			width,
			active,
			is_default,
			coalesce(details, '{}'::jsonb) as details
		from product_variations
		where product_id = $1
		  and tenant_id  = $2
		order by is_default desc, combination asc, sku asc
	`, out.ID, tenantID)
	if err != nil {
		http.Error(w, "erro ao buscar variações: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type tmpVar struct {
		v       ProductVariation
		p       sql.NullString
		cp      sql.NullString
		w       sql.NullString
		l       sql.NullString
		hh      sql.NullString
		wd      sql.NullString
		comb    sql.NullString
		ean     sql.NullString
		details []byte
	}
	var variations []ProductVariation
	var varIDs []string

	for rows.Next() {
		var t tmpVar

		if err := rows.Scan(
			&t.v.ID,
			&t.v.ProductID,
			&t.comb,
			&t.v.SKU,
			&t.ean,
			&t.p,
			&t.cp,
			&t.w,
			&t.l,
			&t.hh,
			&t.wd,
			&t.v.Active,
			&t.v.IsDefault,
			&t.details,
		); err != nil {
			http.Error(w, "erro ao ler variações: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if t.comb.Valid {
			v := t.comb.String
			t.v.Combination = &v
		}
		if t.ean.Valid {
			v := t.ean.String
			t.v.EAN = &v
		}

		// NUMÉRICOS como string (pra não quebrar formatação)
		if t.p.Valid {
			v := t.p.String
			t.v.Price = &v
		}
		if t.cp.Valid {
			v := t.cp.String
			t.v.CostPrice = &v
		}
		if t.w.Valid {
			v := t.w.String
			t.v.Weight = &v
		}
		if t.l.Valid {
			v := t.l.String
			t.v.Length = &v
		}
		if t.hh.Valid {
			v := t.hh.String
			t.v.Height = &v
		}
		if t.wd.Valid {
			v := t.wd.String
			t.v.Width = &v
		}

		t.v.Details = json.RawMessage(t.details)
		t.v.Images = []VariationImageOut{}

		variations = append(variations, t.v)
		varIDs = append(varIDs, t.v.ID)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar variações: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3) busca imagens por variação (em lote) e associa
	imagesByVar := map[string][]VariationImageOut{}
	if len(varIDs) > 0 {
		imgRows, err := h.DB.Query(`
			select
				id,
				variation_id,
				url,
				is_primary,
				position,
				description
			from product_variation_images
			where tenant_id = $1
			and variation_id = any($2)
			order by variation_id asc,
					is_primary desc,          -- primária primeiro
					position asc nulls last,  -- depois ordena por posição
					id asc
		`, tenantID, pqArray(varIDs))
		if err != nil {
			http.Error(w, "erro ao buscar imagens: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer imgRows.Close()

		for imgRows.Next() {
			var img VariationImageOut
			var variationID string
			var pos sql.NullInt32
			var desc sql.NullString

			if err := imgRows.Scan(
				&img.ID,
				&variationID,
				&img.URL,
				&img.IsPrimary,
				&pos,
				&desc,
			); err != nil {
				http.Error(w, "erro ao ler imagens: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if pos.Valid {
				p := int(pos.Int32)
				img.Position = &p
			}

			if desc.Valid {
				d := desc.String
				img.Desc = &d
			}

			imagesByVar[variationID] = append(imagesByVar[variationID], img)
		}
		if err := imgRows.Err(); err != nil {
			http.Error(w, "erro ao iterar imagens: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// associa imagens no slice final
	for i := range variations {
		variations[i].Images = imagesByVar[variations[i].ID]
	}

	out.Variations = variations

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

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
	// newCode, err := h.generateNextProductCode(tenantID)
	// if err != nil {
	// 	http.Error(w, "erro ao gerar código do produto: "+err.Error(), http.StatusInternalServerError)
	// 	return
	// }

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
		//newCode,
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
		ID:       newID,
		TenantID: tenantID,
		//Code:           newCode,
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

func mustJSONRaw(raw json.RawMessage) string {
	if len(raw) == 0 {
		return "{}"
	}

	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return "{}"
	}

	var js any
	if err := json.Unmarshal(raw, &js); err != nil {
		return "{}"
	}

	return trimmed
}

func insertVariationImagesTX(tx *sql.Tx, tenantID, variationID string, imgs []VariationImageInput) error {
	valid := make([]VariationImageInput, 0, len(imgs))
	for _, img := range imgs {
		if strings.TrimSpace(img.URL) == "" {
			continue
		}
		img.URL = strings.TrimSpace(img.URL)
		valid = append(valid, img)
	}
	if len(valid) == 0 {
		return nil
	}

	primaryIdx := -1
	for i := range valid {
		if valid[i].IsPrimary {
			primaryIdx = i
			break
		}
	}
	if primaryIdx == -1 {
		primaryIdx = 0
		valid[0].IsPrimary = true
	}

	for i := range valid {
		valid[i].IsPrimary = (i == primaryIdx)
	}

	posCounter := 1
	for i := range valid {
		img := valid[i]

		var pos *int
		if !img.IsPrimary {
			if img.Position != nil && *img.Position > 0 {
				pos = img.Position
			} else {
				p := posCounter
				pos = &p
			}
			posCounter++
		} else {
			pos = nil
		}

		_, err := tx.Exec(`
			insert into product_variation_images (
				id, tenant_id, variation_id, url, is_primary, position
			) values ($1,$2,$3,$4,$5,$6)
		`,
			uuid.NewString(),
			tenantID,
			variationID,
			img.URL,
			img.IsPrimary,
			pos,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func pqArray(ids []string) interface{} {
	return pq.Array(ids)
}

func normalizeNumericField(v any) (*string, error) {
	if v == nil {
		return nil, nil
	}
	switch t := v.(type) {
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return nil, nil
		}
		return &s, nil
	case float64:
		s := fmt.Sprintf("%.2f", t)
		return &s, nil
	default:
		return nil, fmt.Errorf("tipo inválido para campo numérico: %T", v)
	}
}
