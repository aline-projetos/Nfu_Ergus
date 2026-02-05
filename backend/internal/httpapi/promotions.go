package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Promotion struct {
	ID              string   `json:"id"`
	TenantID        string   `json:"tenant_id"`
	Code            string   `json:"code"`
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	StartDate       string   `json:"start_date"`
	EndDate         string   `json:"end_date"`
	UsePercentage   bool     `json:"use_percentage"`
	Value           float64  `json:"value"`
	AdjustCents     bool     `json:"adjust_cents"`
	ValueAdjustment float64  `json:"value_adjustment"`
	Active          bool     `json:"active"`
	Products        []string `json:"products"`
	Categories      []string `json:"categories"`
}

type PromotionUpdateInput struct {
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	StartDate       string   `json:"start_date"`
	EndDate         string   `json:"end_date"`
	UsePercentage   bool     `json:"use_percentage"`
	Value           float64  `json:"value"`
	AdjustCents     bool     `json:"adjust_cents"`
	ValueAdjustment float64  `json:"value_adjustment"`
	Active          bool     `json:"active"`
	Products        []string `json:"products"`
	Categories      []string `json:"categories"`
}

type PromotionHandler struct {
	DB *sql.DB
}

func NewPromotionHandler(db *sql.DB) *PromotionHandler {
	return &PromotionHandler{DB: db}
}

func (h *PromotionHandler) GenerateNextPromotionCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select code
		  from promotions
		 where tenant_id = $1
		   and code like 'PROMO%'
		 order by code desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		return "PROMO001", nil
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

	return fmt.Sprintf("PROMO%03d", num), nil
}

func (h *PromotionHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/promotions", h.HandlePromotions)
	mux.HandleFunc("/promotions/", h.HandlePromotionByID)
}

func (h *PromotionHandler) HandlePromotions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListPromotions(w, r)
	case http.MethodPost:
		h.CreatePromotion(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *PromotionHandler) HandlePromotionByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/promotions/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetPromotionByID(w, r, id)
	case http.MethodPut:
		h.UpdatePromotion(w, r, id)
	case http.MethodDelete:
		h.DeletePromotion(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *PromotionHandler) CreatePromotion(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// 1) exige sessão válida
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

	var promo Promotion
	if err := json.NewDecoder(r.Body).Decode(&promo); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(promo.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	promo.ID = uuid.NewString()
	promo.TenantID = tenantID

	nextCode, err := h.GenerateNextPromotionCode(tenantID)
	if err != nil {
		http.Error(w, "Erro ao gerar código da promoção", http.StatusInternalServerError)
		return
	}
	promo.Code = nextCode

	// ---- TRANSAÇÃO ----
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "Erro ao iniciar transação", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// mapeia use_percentage -> discount_type
	discountType := "valor fixo"
	if promo.UsePercentage {
		discountType = "porcentagem"
	}

	// 1) insere promoção
	_, err = tx.Exec(`
		INSERT INTO promotions (
			id, tenant_id, code, name, type,
			start_date, end_date, description,
			discount_type, discount_value,
			apply_fix_cents, fix_value_cents,
			is_active
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`,
		promo.ID,
		promo.TenantID,
		promo.Code,
		promo.Name,
		promo.Type,
		promo.StartDate, // string → Postgres converte para TIMESTAMPTZ
		promo.EndDate,
		"", // description (por enquanto vazio)
		discountType,
		promo.Value,
		promo.AdjustCents,
		promo.ValueAdjustment,
		promo.Active,
	)
	if err != nil {
		http.Error(w, "Erro ao criar promoção: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2) vínculos com produtos/categorias
	if err := h.insertPromotionRelationsTx(tx, &promo); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 3) commit
	if err := tx.Commit(); err != nil {
		http.Error(w, "Erro ao confirmar transação", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(promo)
}

func (h *PromotionHandler) ListPromotions(w http.ResponseWriter, r *http.Request) {
	// 1) exige sessão válida
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

	rows, err := h.DB.Query(`
        SELECT id, tenant_id, code, name, type,
               start_date, end_date,
               discount_type, discount_value,
               apply_fix_cents, fix_value_cents,
               is_active
          FROM promotions
         WHERE tenant_id = $1
    `, tenantID)
	if err != nil {
		log.Printf("[ListPromotions] erro na query: %v", err)
		http.Error(w, "Erro ao listar promoções", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	promotions := make([]Promotion, 0)
	for rows.Next() {
		var promo Promotion
		var (
			startTime, endTime time.Time
			discountType       string
		)

		if err := rows.Scan(
			&promo.ID,
			&promo.TenantID,
			&promo.Code,
			&promo.Name,
			&promo.Type,
			&startTime,
			&endTime,
			&discountType,
			&promo.Value,
			&promo.AdjustCents,
			&promo.ValueAdjustment,
			&promo.Active,
		); err != nil {
			http.Error(w, "Erro ao ler promoções", http.StatusInternalServerError)
			return
		}

		// converte datas para string (RFC3339) para o front
		promo.StartDate = startTime.Format(time.RFC3339)
		promo.EndDate = endTime.Format(time.RFC3339)

		// mapeia discount_type -> use_percentage
		promo.UsePercentage = (discountType == "porcentagem")

		promotions = append(promotions, promo)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Erro ao iterar sobre promoções", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(promotions)
}

func (h *PromotionHandler) GetPromotionByID(w http.ResponseWriter, r *http.Request, id string) {
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

	var (
		p            Promotion
		startTime    time.Time
		endTime      time.Time
		discountType string
	)

	err = h.DB.QueryRow(`
        SELECT id, tenant_id, code, name, type,
               start_date, end_date,
               discount_type, discount_value,
               apply_fix_cents, fix_value_cents,
               is_active
          FROM promotions
         WHERE id = $1
           AND tenant_id = $2
    `, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&p.Type,
		&startTime,
		&endTime,
		&discountType,
		&p.Value,
		&p.AdjustCents,
		&p.ValueAdjustment,
		&p.Active,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "promoção não encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar promoção: "+err.Error(), http.StatusInternalServerError)
		return
	}

	p.StartDate = startTime.Format(time.RFC3339)
	p.EndDate = endTime.Format(time.RFC3339)
	p.UsePercentage = (discountType == "porcentagem")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

func (h *PromotionHandler) UpdatePromotion(
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

	var in PromotionUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name é obrigatório", http.StatusBadRequest)
		return
	}

	// ---- TRANSAÇÃO ----
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "Erro ao iniciar transação", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	discountType := "valor fixo"
	if in.UsePercentage {
		discountType = "porcentagem"
	}

	// 1) update da promoção
	res, err := tx.Exec(`
		UPDATE promotions
		SET 
			name             = $1,
			type             = $2, 
			start_date       = $3, 
			end_date         = $4, 
			discount_ype   = $5, 
			value            = $6, 
			adjust_cents     = $7, 
			value_adjustment = $8, 
			active           = $9
		WHERE id        = $10
		  AND tenant_id = $11
	`,
		in.Name,
		in.Type,
		in.StartDate,
		in.EndDate,
		discountType,
		in.Value,
		in.AdjustCents,
		in.ValueAdjustment,
		in.Active,
		id,
		tenantID,
	)
	if err != nil {
		http.Error(w, "erro ao atualizar promoção: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "promoção não encontrada", http.StatusNotFound)
		return
	}

	// 2) limpar vínculos antigos
	if err := h.clearPromotionRelationsTx(tx, tenantID, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 3) inserir vínculos novos
	promo := Promotion{
		ID:         id,
		TenantID:   tenantID,
		Products:   in.Products,
		Categories: in.Categories,
	}
	if err := h.insertPromotionRelationsTx(tx, &promo); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4) commit
	if err := tx.Commit(); err != nil {
		http.Error(w, "Erro ao confirmar transação", http.StatusInternalServerError)
		return
	}

	// 5) retornar promoção atualizada (sem os vínculos, por enquanto)
	// 5) retornar promoção atualizada
	var (
		p              Promotion
		startTime      time.Time
		endTime        time.Time
		dbDiscountType string
	)

	err = h.DB.QueryRow(`
		SELECT id, tenant_id, code, name, type,
			start_date, end_date,
			discount_type, discount_value,
			apply_fix_cents, fix_value_cents,
			is_active
		FROM promotions
		WHERE id = $1
		AND tenant_id = $2
	`, id, tenantID).Scan(
		&p.ID,
		&p.TenantID,
		&p.Code,
		&p.Name,
		&p.Type,
		&startTime,
		&endTime,
		&dbDiscountType,
		&p.Value,
		&p.AdjustCents,
		&p.ValueAdjustment,
		&p.Active,
	)
	if err != nil {
		http.Error(w, "erro ao buscar promoção atualizada: "+err.Error(), http.StatusInternalServerError)
		return
	}

	p.StartDate = startTime.Format(time.RFC3339)
	p.EndDate = endTime.Format(time.RFC3339)
	p.UsePercentage = (dbDiscountType == "porcentagem")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)

}

func (h *PromotionHandler) DeletePromotion(w http.ResponseWriter, r *http.Request, id string) {
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
		delete from promotions
		where id = $1
		and tenant_id = $2
	`, id, tenantID)

	if err != nil {
		http.Error(w, "erro ao excluir promoção: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "promoção não encontrada", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *PromotionHandler) insertPromotionRelationsTx(
	tx *sql.Tx,
	promo *Promotion,
) error {
	// Produtos
	for _, productID := range promo.Products {
		if strings.TrimSpace(productID) == "" {
			continue
		}
		_, err := tx.Exec(`
			INSERT INTO promotion_products (id, tenant_id, promotion_id, product_id)
			VALUES ($1, $2, $3, $4)
		`,
			uuid.NewString(),
			promo.TenantID,
			promo.ID,
			productID,
		)
		if err != nil {
			return fmt.Errorf("erro ao vincular produto à promoção: %w", err)
		}
	}

	// Categorias
	for _, categoryID := range promo.Categories {
		if strings.TrimSpace(categoryID) == "" {
			continue
		}
		_, err := tx.Exec(`
			INSERT INTO promotion_categories (id, tenant_id, promotion_id, category_id)
			VALUES ($1, $2, $3, $4)
		`,
			uuid.NewString(),
			promo.TenantID,
			promo.ID,
			categoryID,
		)
		if err != nil {
			return fmt.Errorf("erro ao vincular categoria à promoção: %w", err)
		}
	}

	return nil
}

func (h *PromotionHandler) clearPromotionRelationsTx(
	tx *sql.Tx,
	tenantID, promoID string,
) error {
	// apaga vínculos antigos (usado no update)
	if _, err := tx.Exec(`
		DELETE FROM promotion_products
		WHERE tenant_id = $1 AND promotion_id = $2
	`, tenantID, promoID); err != nil {
		return fmt.Errorf("erro ao limpar produtos da promoção: %w", err)
	}

	if _, err := tx.Exec(`
		DELETE FROM promotion_categories
		WHERE tenant_id = $1 AND promotion_id = $2
	`, tenantID, promoID); err != nil {
		return fmt.Errorf("erro ao limpar categorias da promoção: %w", err)
	}

	return nil
}
