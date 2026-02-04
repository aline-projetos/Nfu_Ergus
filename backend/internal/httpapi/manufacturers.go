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

// -----------------------------------------------------------------------------
// Manufacturer model (JSON <-> DB)
// -----------------------------------------------------------------------------

type Manufacturer struct {
	ID       string `json:"id"`
	TenantID string `json:"tenantId"`

	Codigo string `json:"codigo"`
	Nome   string `json:"nome"`
	Tipo   string `json:"tipo"` // "fisica" | "juridica"

	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	// Contato principal
	ContatoPrincipalNome     *string `json:"contatoPrincipalNome"`
	ContatoPrincipalTelefone *string `json:"contatoPrincipalTelefone"`
	ContatoPrincipalEmail    *string `json:"contatoPrincipalEmail"`

	// Contato secundário
	ContatoSecundarioNome     *string `json:"contatoSecundarioNome"`
	ContatoSecundarioTelefone *string `json:"contatoSecundarioTelefone"`
	ContatoSecundarioEmail    *string `json:"contatoSecundarioEmail"`

	// Endereço / localização
	CEP         *string `json:"cep"`
	Logradouro  *string `json:"logradouro"`
	Numero      *string `json:"numero"`
	Complemento *string `json:"complemento"`
	Bairro      *string `json:"bairro"`

	CodigoCidade *string `json:"codigoCidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	Observacoes *string `json:"observacoes"`

	Ativo bool `json:"ativo"`
}

type ManufacturerInput struct {
	Nome              string  `json:"nome"`
	Tipo              string  `json:"tipo"` // "fisica" | "juridica"
	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	ContatoPrincipalNome     *string `json:"contatoPrincipalNome"`
	ContatoPrincipalTelefone *string `json:"contatoPrincipalTelefone"`
	ContatoPrincipalEmail    *string `json:"contatoPrincipalEmail"`

	ContatoSecundarioNome     *string `json:"contatoSecundarioNome"`
	ContatoSecundarioTelefone *string `json:"contatoSecundarioTelefone"`
	ContatoSecundarioEmail    *string `json:"contatoSecundarioEmail"`

	CEP         *string `json:"cep"`
	Logradouro  *string `json:"logradouro"`
	Numero      *string `json:"numero"`
	Complemento *string `json:"complemento"`
	Bairro      *string `json:"bairro"`

	CodigoCidade *string `json:"codigoCidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	Observacoes *string `json:"observacoes"`

	Ativo *bool `json:"ativo"`
}

type ManufacturerUpdateInput struct {
	Nome              string  `json:"nome"`
	Tipo              string  `json:"tipo"` // "fisica" | "juridica"
	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	ContatoPrincipalNome     *string `json:"contatoPrincipalNome"`
	ContatoPrincipalTelefone *string `json:"contatoPrincipalTelefone"`
	ContatoPrincipalEmail    *string `json:"contatoPrincipalEmail"`

	ContatoSecundarioNome     *string `json:"contatoSecundarioNome"`
	ContatoSecundarioTelefone *string `json:"contatoSecundarioTelefone"`
	ContatoSecundarioEmail    *string `json:"contatoSecundarioEmail"`

	CEP         *string `json:"cep"`
	Logradouro  *string `json:"logradouro"`
	Numero      *string `json:"numero"`
	Complemento *string `json:"complemento"`
	Bairro      *string `json:"bairro"`

	CodigoCidade *string `json:"codigoCidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	Observacoes *string `json:"observacoes"`

	Ativo *bool `json:"ativo"`
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

type ManufacturerHandler struct {
	DB *sql.DB
}

func NewManufacturerHandler(db *sql.DB) *ManufacturerHandler {
	return &ManufacturerHandler{DB: db}
}

// Gera próximo código FABnnn por tenant
func (h *ManufacturerHandler) generateNextManufacturerCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select codigo
		  from manufacturers
		 where tenant_id = $1
		   and codigo like 'FAB%'
		 order by codigo desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		return "FAB001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código de fabricante: %w", err)
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

	return fmt.Sprintf("FAB%03d", num), nil
}

func isValidManufacturerType(tp string) bool {
	switch strings.ToLower(strings.TrimSpace(tp)) {
	case "fisica", "juridica":
		return true
	default:
		return false
	}
}

// -----------------------------------------------------------------------------
// Registro de rotas
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/manufacturers", h.handleManufacturers)
	mux.HandleFunc("/manufacturers/", h.handleManufacturerByID)
}

func (h *ManufacturerHandler) handleManufacturers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateManufacturer(w, r)
	case http.MethodGet:
		h.ListManufacturers(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *ManufacturerHandler) handleManufacturerByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/manufacturers/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetManufacturerByID(w, r, id)
	case http.MethodPut:
		h.UpdateManufacturer(w, r, id)
	case http.MethodDelete:
		h.DeleteManufacturer(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// POST /manufacturers
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) CreateManufacturer(w http.ResponseWriter, r *http.Request) {
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

	var in ManufacturerInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Nome) == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}
	if !isValidManufacturerType(in.Tipo) {
		http.Error(w, "tipo inválido, use 'fisica' ou 'juridica'", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(in.Cidade) == "" {
		http.Error(w, "cidade é obrigatória", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(in.UF) == "" {
		http.Error(w, "uf é obrigatória", http.StatusBadRequest)
		return
	}

	newID := uuid.NewString()
	nextCode, err := h.generateNextManufacturerCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do fabricante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// default para ativo = true se vier nil
	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	_, err = h.DB.Exec(`
		insert into manufacturers (
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cnpj,
			inscricao_estadual,
			contato_principal_nome,
			contato_principal_telefone,
			contato_principal_email,
			contato_secundario_nome,
			contato_secundario_telefone,
			contato_secundario_email,
			cep,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		) values (
			$1,$2,$3,$4,$5,
			$6,$7,
			$8,$9,$10,
			$11,$12,$13,
			$14,$15,$16,$17,$18,
			$19,$20,$21,$22,$23
		)
	`,
		newID,
		tenantID,
		nextCode,
		strings.TrimSpace(in.Nome),
		strings.ToLower(strings.TrimSpace(in.Tipo)),
		in.CNPJ,
		in.InscricaoEstadual,
		in.ContatoPrincipalNome,
		in.ContatoPrincipalTelefone,
		in.ContatoPrincipalEmail,
		in.ContatoSecundarioNome,
		in.ContatoSecundarioTelefone,
		in.ContatoSecundarioEmail,
		in.CEP,
		in.Logradouro,
		in.Numero,
		in.Complemento,
		in.Bairro,
		in.CodigoCidade,
		strings.TrimSpace(in.Cidade),
		strings.ToUpper(strings.TrimSpace(in.UF)),
		in.Observacoes,
		ativo,
	)

	if err != nil {
		http.Error(w, "erro ao salvar fabricante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := Manufacturer{
		ID:       newID,
		TenantID: tenantID,
		Codigo:   nextCode,
		Nome:     strings.TrimSpace(in.Nome),
		Tipo:     strings.ToLower(strings.TrimSpace(in.Tipo)),

		CNPJ:              in.CNPJ,
		InscricaoEstadual: in.InscricaoEstadual,

		ContatoPrincipalNome:     in.ContatoPrincipalNome,
		ContatoPrincipalTelefone: in.ContatoPrincipalTelefone,
		ContatoPrincipalEmail:    in.ContatoPrincipalEmail,

		ContatoSecundarioNome:     in.ContatoSecundarioNome,
		ContatoSecundarioTelefone: in.ContatoSecundarioTelefone,
		ContatoSecundarioEmail:    in.ContatoSecundarioEmail,

		CEP:         in.CEP,
		Logradouro:  in.Logradouro,
		Numero:      in.Numero,
		Complemento: in.Complemento,
		Bairro:      in.Bairro,

		CodigoCidade: in.CodigoCidade,
		Cidade:       strings.TrimSpace(in.Cidade),
		UF:           strings.ToUpper(strings.TrimSpace(in.UF)),

		Observacoes: in.Observacoes,

		Ativo: ativo,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

// -----------------------------------------------------------------------------
// GET /manufacturers
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) ListManufacturers(w http.ResponseWriter, r *http.Request) {
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

	// 3) filtros / paginação
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	pageStr := r.URL.Query().Get("page")
	sizeStr := r.URL.Query().Get("page_size")

	page := 1
	pageSize := 50

	if v, errConv := strconv.Atoi(pageStr); errConv == nil && v > 0 {
		page = v
	}
	if v, errConv := strconv.Atoi(sizeStr); errConv == nil && v > 0 && v <= 200 {
		pageSize = v
	}

	offset := (page - 1) * pageSize

	var rows *sql.Rows

	// 4) monta a query conforme tenha filtro ou não
	if q != "" {
		// Busca por código exato OU nome contendo q
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				codigo,
				nome,
				tipo,
				cnpj,
				inscricao_estadual,
				contato_principal_nome,
				contato_principal_telefone,
				contato_principal_email,
				contato_secundario_nome,
				contato_secundario_telefone,
				contato_secundario_email,
				cep,
				logradouro,
				numero,
				complemento,
				bairro,
				codigo_cidade,
				cidade,
				uf,
				observacoes,
				ativo
			from manufacturers
			where tenant_id = $1
			  and (
			       codigo = $2
			       or nome ilike '%' || $2 || '%'
			  )
			order by nome asc
			limit $3 offset $4
		`, tenantID, q, pageSize, offset)
	} else {
		// Lista geral, paginada
		rows, err = h.DB.Query(`
			select
				id,
				tenant_id,
				codigo,
				nome,
				tipo,
				cnpj,
				inscricao_estadual,
				contato_principal_nome,
				contato_principal_telefone,
				contato_principal_email,
				contato_secundario_nome,
				contato_secundario_telefone,
				contato_secundario_email,
				cep,
				logradouro,
				numero,
				complemento,
				bairro,
				codigo_cidade,
				cidade,
				uf,
				observacoes,
				ativo
			from manufacturers
			where tenant_id = $1
			order by nome asc
			limit $2 offset $3
		`, tenantID, pageSize, offset)
	}

	if err != nil {
		http.Error(w, "erro ao listar fabricantes: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	mans := make([]Manufacturer, 0)

	for rows.Next() {
		var m Manufacturer
		if err := rows.Scan(
			&m.ID,
			&m.TenantID,
			&m.Codigo,
			&m.Nome,
			&m.Tipo,
			&m.CNPJ,
			&m.InscricaoEstadual,
			&m.ContatoPrincipalNome,
			&m.ContatoPrincipalTelefone,
			&m.ContatoPrincipalEmail,
			&m.ContatoSecundarioNome,
			&m.ContatoSecundarioTelefone,
			&m.ContatoSecundarioEmail,
			&m.CEP,
			&m.Logradouro,
			&m.Numero,
			&m.Complemento,
			&m.Bairro,
			&m.CodigoCidade,
			&m.Cidade,
			&m.UF,
			&m.Observacoes,
			&m.Ativo,
		); err != nil {
			http.Error(w, "erro ao ler fabricantes: "+err.Error(), http.StatusInternalServerError)
			return
		}
		mans = append(mans, m)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar fabricantes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(mans)
}

// -----------------------------------------------------------------------------
// GET /manufacturers/{id}
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) GetManufacturerByID(
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

	var m Manufacturer
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cnpj,
			inscricao_estadual,
			contato_principal_nome,
			contato_principal_telefone,
			contato_principal_email,
			contato_secundario_nome,
			contato_secundario_telefone,
			contato_secundario_email,
			cep,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		from manufacturers
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&m.ID,
		&m.TenantID,
		&m.Codigo,
		&m.Nome,
		&m.Tipo,
		&m.CNPJ,
		&m.InscricaoEstadual,
		&m.ContatoPrincipalNome,
		&m.ContatoPrincipalTelefone,
		&m.ContatoPrincipalEmail,
		&m.ContatoSecundarioNome,
		&m.ContatoSecundarioTelefone,
		&m.ContatoSecundarioEmail,
		&m.CEP,
		&m.Logradouro,
		&m.Numero,
		&m.Complemento,
		&m.Bairro,
		&m.CodigoCidade,
		&m.Cidade,
		&m.UF,
		&m.Observacoes,
		&m.Ativo,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "fabricante não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar fabricante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(m)
}

// -----------------------------------------------------------------------------
// PUT /manufacturers/{id}
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) UpdateManufacturer(
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

	var in ManufacturerUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Nome) == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}
	if !isValidManufacturerType(in.Tipo) {
		http.Error(w, "tipo inválido, use 'fisica' ou 'juridica'", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(in.Cidade) == "" {
		http.Error(w, "cidade é obrigatória", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(in.UF) == "" {
		http.Error(w, "uf é obrigatória", http.StatusBadRequest)
		return
	}

	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	res, err := h.DB.Exec(`
		update manufacturers
		   set nome                   = $1,
		       tipo                   = $2,
		       cnpj                   = $3,
		       inscricao_estadual     = $4,
		       contato_principal_nome = $5,
		       contato_principal_telefone = $6,
		       contato_principal_email    = $7,
		       contato_secundario_nome    = $8,
		       contato_secundario_telefone= $9,
		       contato_secundario_email   = $10,
		       cep                    = $11,
		       logradouro             = $12,
		       numero                 = $13,
		       complemento            = $14,
		       bairro                 = $15,
		       codigo_cidade          = $16,
		       cidade                 = $17,
		       uf                     = $18,
		       observacoes            = $19,
		       ativo                  = $20
		 where id        = $21
		   and tenant_id  = $22
	`,
		strings.TrimSpace(in.Nome),
		strings.ToLower(strings.TrimSpace(in.Tipo)),
		in.CNPJ,
		in.InscricaoEstadual,
		in.ContatoPrincipalNome,
		in.ContatoPrincipalTelefone,
		in.ContatoPrincipalEmail,
		in.ContatoSecundarioNome,
		in.ContatoSecundarioTelefone,
		in.ContatoSecundarioEmail,
		in.CEP,
		in.Logradouro,
		in.Numero,
		in.Complemento,
		in.Bairro,
		in.CodigoCidade,
		strings.TrimSpace(in.Cidade),
		strings.ToUpper(strings.TrimSpace(in.UF)),
		in.Observacoes,
		ativo,
		id,
		tenantID,
	)

	if err != nil {
		http.Error(w, "erro ao atualizar fabricante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "fabricante não encontrado", http.StatusNotFound)
		return
	}

	// recarrega para devolver o estado atualizado
	var m Manufacturer
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cnpj,
			inscricao_estadual,
			contato_principal_nome,
			contato_principal_telefone,
			contato_principal_email,
			contato_secundario_nome,
			contato_secundario_telefone,
			contato_secundario_email,
			cep,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		from manufacturers
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&m.ID,
		&m.TenantID,
		&m.Codigo,
		&m.Nome,
		&m.Tipo,
		&m.CNPJ,
		&m.InscricaoEstadual,
		&m.ContatoPrincipalNome,
		&m.ContatoPrincipalTelefone,
		&m.ContatoPrincipalEmail,
		&m.ContatoSecundarioNome,
		&m.ContatoSecundarioTelefone,
		&m.ContatoSecundarioEmail,
		&m.CEP,
		&m.Logradouro,
		&m.Numero,
		&m.Complemento,
		&m.Bairro,
		&m.CodigoCidade,
		&m.Cidade,
		&m.UF,
		&m.Observacoes,
		&m.Ativo,
	)
	if err != nil {
		http.Error(w, "erro ao buscar fabricante atualizado: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(m)
}

// -----------------------------------------------------------------------------
// DELETE /manufacturers/{id}
// -----------------------------------------------------------------------------

func (h *ManufacturerHandler) DeleteManufacturer(
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
		delete from manufacturers
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID)
	if err != nil {
		http.Error(w, "erro ao excluir fabricante: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "fabricante não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
