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
// Supplier model (JSON <-> DB)
// -----------------------------------------------------------------------------

type Supplier struct {
	ID       string `json:"id"`
	TenantID string `json:"tenantId"`

	Codigo string `json:"codigo"`
	Nome   string `json:"nome"`
	Tipo   string `json:"tipo"` // "fisica" | "juridica"

	CPF               *string `json:"cpf"`
	RG                *string `json:"rg"`
	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	// Contato principal
	NomeContatoPrincipal     *string `json:"nome_contato_principal"`
	TelefoneContatoPrincipal *string `json:"telefone_contato_principal"`
	EmailContatoPrincipal    *string `json:"email_contato_principal"`

	// Contato secundário / endereço
	CEP                       *string `json:"cep"`
	NomeContatoSecundario     *string `json:"nome_contato_secundario"`
	TelefoneContatoSecundario *string `json:"telefone_contato_secundario"`
	EmailContatoSecundario    *string `json:"email_contato_secundario"`
	Logradouro                *string `json:"logradouro"`
	Numero                    *string `json:"numero"`
	Complemento               *string `json:"complemento"`
	Bairro                    *string `json:"bairro"`

	// Localização
	CodigoCidade *string `json:"codigo_cidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	// Outros
	Observacoes *string `json:"observacoes"`

	Ativo bool `json:"ativo"`
}

type SupplierInput struct {
	Nome string `json:"nome"`
	Tipo string `json:"tipo"` // "fisica" | "juridica"

	CPF               *string `json:"cpf"`
	RG                *string `json:"rg"`
	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	NomeContatoPrincipal     *string `json:"nome_contato_principal"`
	TelefoneContatoPrincipal *string `json:"telefone_contato_principal"`
	EmailContatoPrincipal    *string `json:"email_contato_principal"`

	CEP                       *string `json:"cep"`
	NomeContatoSecundario     *string `json:"nome_contato_secundario"`
	TelefoneContatoSecundario *string `json:"telefone_contato_secundario"`
	EmailContatoSecundario    *string `json:"email_contato_secundario"`
	Logradouro                *string `json:"logradouro"`
	Numero                    *string `json:"numero"`
	Complemento               *string `json:"complemento"`
	Bairro                    *string `json:"bairro"`

	CodigoCidade *string `json:"codigo_cidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	Observacoes *string `json:"observacoes"`

	Ativo *bool `json:"ativo"`
}

type SupplierUpdateInput struct {
	Nome string `json:"nome"`
	Tipo string `json:"tipo"` // "fisica" | "juridica"

	CPF               *string `json:"cpf"`
	RG                *string `json:"rg"`
	CNPJ              *string `json:"cnpj"`
	InscricaoEstadual *string `json:"inscricao_estadual"`

	NomeContatoPrincipal     *string `json:"nome_contato_principal"`
	TelefoneContatoPrincipal *string `json:"telefone_contato_principal"`
	EmailContatoPrincipal    *string `json:"email_contato_principal"`

	CEP                       *string `json:"cep"`
	NomeContatoSecundario     *string `json:"nome_contato_secundario"`
	TelefoneContatoSecundario *string `json:"telefone_contato_secundario"`
	EmailContatoSecundario    *string `json:"email_contato_secundario"`
	Logradouro                *string `json:"logradouro"`
	Numero                    *string `json:"numero"`
	Complemento               *string `json:"complemento"`
	Bairro                    *string `json:"bairro"`

	CodigoCidade *string `json:"codigo_cidade"`
	Cidade       string  `json:"cidade"`
	UF           string  `json:"uf"`

	Observacoes *string `json:"observacoes"`

	Ativo *bool `json:"ativo"`
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

type SupplierHandler struct {
	DB *sql.DB
}

func NewSupplierHandler(db *sql.DB) *SupplierHandler {
	return &SupplierHandler{DB: db}
}

// Gera próximo código FORNnnn por tenant
func (h *SupplierHandler) generateNextSupplierCode(tenantID string) (string, error) {
	var lastCode sql.NullString

	err := h.DB.QueryRow(`
		select codigo
		  from suppliers
		 where tenant_id = $1
		   and codigo like 'FORN%'
		 order by codigo desc
		 limit 1
	`, tenantID).Scan(&lastCode)

	if err == sql.ErrNoRows || !lastCode.Valid {
		return "FORN001", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao buscar último código de fornecedor: %w", err)
	}

	code := lastCode.String
	if len(code) < 4 {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}

	numStr := code[4:]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return "", fmt.Errorf("código inválido encontrado: %s", code)
	}
	num++

	return fmt.Sprintf("FORN%03d", num), nil
}

func isValidSupplierType(tp string) bool {
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

func (h *SupplierHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/suppliers", h.handleSuppliers)
	mux.HandleFunc("/suppliers/", h.handleSupplierByID)
}

func (h *SupplierHandler) handleSuppliers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.CreateSupplier(w, r)
	case http.MethodGet:
		h.ListSuppliers(w, r)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

func (h *SupplierHandler) handleSupplierByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/suppliers/")
	if id == "" {
		http.Error(w, "id não informado", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetSupplierByID(w, r, id)
	case http.MethodPut:
		h.UpdateSupplier(w, r, id)
	case http.MethodDelete:
		h.DeleteSupplier(w, r, id)
	default:
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
	}
}

// -----------------------------------------------------------------------------
// POST /suppliers
// -----------------------------------------------------------------------------

func (h *SupplierHandler) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// 1) sessão válida
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

	var in SupplierInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Nome) == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}
	if !isValidSupplierType(in.Tipo) {
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
	nextCode, err := h.generateNextSupplierCode(tenantID)
	if err != nil {
		http.Error(w, "erro ao gerar código do fornecedor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}

	_, err = h.DB.Exec(`
		insert into suppliers (
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cpf,
			rg,
			cnpj,
			inscricao_estadual,
			nome_contato_principal,
			telefone_contato_principal,
			email_contato_principal,
			cep,
			nome_contato_secundario,
			telefone_contato_secundario,
			email_contato_secundario,
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
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
		)
	`,
		newID,
		tenantID,
		nextCode,
		strings.TrimSpace(in.Nome),
		strings.ToLower(strings.TrimSpace(in.Tipo)),
		in.CPF,
		in.RG,
		in.CNPJ,
		in.InscricaoEstadual,
		in.NomeContatoPrincipal,
		in.TelefoneContatoPrincipal,
		in.EmailContatoPrincipal,
		in.CEP,
		in.NomeContatoSecundario,
		in.TelefoneContatoSecundario,
		in.EmailContatoSecundario,
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
		http.Error(w, "erro ao salvar fornecedor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	out := Supplier{
		ID:       newID,
		TenantID: tenantID,
		Codigo:   nextCode,
		Nome:     strings.TrimSpace(in.Nome),
		Tipo:     strings.ToLower(strings.TrimSpace(in.Tipo)),

		CPF:               in.CPF,
		RG:                in.RG,
		CNPJ:              in.CNPJ,
		InscricaoEstadual: in.InscricaoEstadual,

		NomeContatoPrincipal:      in.NomeContatoPrincipal,
		TelefoneContatoPrincipal:  in.TelefoneContatoPrincipal,
		EmailContatoPrincipal:     in.EmailContatoPrincipal,
		CEP:                       in.CEP,
		NomeContatoSecundario:     in.NomeContatoSecundario,
		TelefoneContatoSecundario: in.TelefoneContatoSecundario,
		EmailContatoSecundario:    in.EmailContatoSecundario,
		Logradouro:                in.Logradouro,
		Numero:                    in.Numero,
		Complemento:               in.Complemento,
		Bairro:                    in.Bairro,
		CodigoCidade:              in.CodigoCidade,
		Cidade:                    strings.TrimSpace(in.Cidade),
		UF:                        strings.ToUpper(strings.TrimSpace(in.UF)),
		Observacoes:               in.Observacoes,
		Ativo:                     ativo,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(out)
}

// -----------------------------------------------------------------------------
// GET /suppliers
// -----------------------------------------------------------------------------

func (h *SupplierHandler) ListSuppliers(w http.ResponseWriter, r *http.Request) {
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

	rows, err := h.DB.Query(`
		select
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cpf,
			rg,
			cnpj,
			inscricao_estadual,
			nome_contato_principal,
			telefone_contato_principal,
			email_contato_principal,
			cep,
			nome_contato_secundario,
			telefone_contato_secundario,
			email_contato_secundario,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		from suppliers
		where tenant_id = $1
		order by nome asc
	`, tenantID)
	if err != nil {
		http.Error(w, "erro ao listar fornecedores: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	sups := make([]Supplier, 0)

	for rows.Next() {
		var s Supplier
		if err := rows.Scan(
			&s.ID,
			&s.TenantID,
			&s.Codigo,
			&s.Nome,
			&s.Tipo,
			&s.CPF,
			&s.RG,
			&s.CNPJ,
			&s.InscricaoEstadual,
			&s.NomeContatoPrincipal,
			&s.TelefoneContatoPrincipal,
			&s.EmailContatoPrincipal,
			&s.CEP,
			&s.NomeContatoSecundario,
			&s.TelefoneContatoSecundario,
			&s.EmailContatoSecundario,
			&s.Logradouro,
			&s.Numero,
			&s.Complemento,
			&s.Bairro,
			&s.CodigoCidade,
			&s.Cidade,
			&s.UF,
			&s.Observacoes,
			&s.Ativo,
		); err != nil {
			http.Error(w, "erro ao ler fornecedores: "+err.Error(), http.StatusInternalServerError)
			return
		}
		sups = append(sups, s)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "erro ao iterar fornecedores: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(sups)
}

// -----------------------------------------------------------------------------
// GET /suppliers/{id}
// -----------------------------------------------------------------------------

func (h *SupplierHandler) GetSupplierByID(
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

	var s Supplier
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cpf,
			rg,
			cnpj,
			inscricao_estadual,
			nome_contato_principal,
			telefone_contato_principal,
			email_contato_principal,
			cep,
			nome_contato_secundario,
			telefone_contato_secundario,
			email_contato_secundario,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		from suppliers
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&s.ID,
		&s.TenantID,
		&s.Codigo,
		&s.Nome,
		&s.Tipo,
		&s.CPF,
		&s.RG,
		&s.CNPJ,
		&s.InscricaoEstadual,
		&s.NomeContatoPrincipal,
		&s.TelefoneContatoPrincipal,
		&s.EmailContatoPrincipal,
		&s.CEP,
		&s.NomeContatoSecundario,
		&s.TelefoneContatoSecundario,
		&s.EmailContatoSecundario,
		&s.Logradouro,
		&s.Numero,
		&s.Complemento,
		&s.Bairro,
		&s.CodigoCidade,
		&s.Cidade,
		&s.UF,
		&s.Observacoes,
		&s.Ativo,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "fornecedor não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "erro ao buscar fornecedor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s)
}

// -----------------------------------------------------------------------------
// PUT /suppliers/{id}
// -----------------------------------------------------------------------------

func (h *SupplierHandler) UpdateSupplier(
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

	var in SupplierUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(in.Nome) == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}
	if !isValidSupplierType(in.Tipo) {
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
		update suppliers
		   set nome                     = $1,
		       tipo                     = $2,
		       cpf                      = $3,
		       rg                       = $4,
		       cnpj                     = $5,
		       inscricao_estadual       = $6,
		       nome_contato_principal   = $7,
		       telefone_contato_principal = $8,
		       email_contato_principal  = $9,
		       cep                      = $10,
		       nome_contato_secundario  = $11,
		       telefone_contato_secundario = $12,
		       email_contato_secundario = $13,
		       logradouro               = $14,
		       numero                   = $15,
		       complemento              = $16,
		       bairro                   = $17,
		       codigo_cidade            = $18,
		       cidade                   = $19,
		       uf                       = $20,
		       observacoes              = $21,
		       ativo                    = $22
		 where id       = $23
		   and tenant_id = $24
	`,
		strings.TrimSpace(in.Nome),
		strings.ToLower(strings.TrimSpace(in.Tipo)),
		in.CPF,
		in.RG,
		in.CNPJ,
		in.InscricaoEstadual,
		in.NomeContatoPrincipal,
		in.TelefoneContatoPrincipal,
		in.EmailContatoPrincipal,
		in.CEP,
		in.NomeContatoSecundario,
		in.TelefoneContatoSecundario,
		in.EmailContatoSecundario,
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
		http.Error(w, "erro ao atualizar fornecedor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "fornecedor não encontrado", http.StatusNotFound)
		return
	}

	// recarrega registro atualizado
	var s Supplier
	err = h.DB.QueryRow(`
		select
			id,
			tenant_id,
			codigo,
			nome,
			tipo,
			cpf,
			rg,
			cnpj,
			inscricao_estadual,
			nome_contato_principal,
			telefone_contato_principal,
			email_contato_principal,
			cep,
			nome_contato_secundario,
			telefone_contato_secundario,
			email_contato_secundario,
			logradouro,
			numero,
			complemento,
			bairro,
			codigo_cidade,
			cidade,
			uf,
			observacoes,
			ativo
		from suppliers
		where id = $1
		  and tenant_id = $2
	`, id, tenantID).Scan(
		&s.ID,
		&s.TenantID,
		&s.Codigo,
		&s.Nome,
		&s.Tipo,
		&s.CPF,
		&s.RG,
		&s.CNPJ,
		&s.InscricaoEstadual,
		&s.NomeContatoPrincipal,
		&s.TelefoneContatoPrincipal,
		&s.EmailContatoPrincipal,
		&s.CEP,
		&s.NomeContatoSecundario,
		&s.TelefoneContatoSecundario,
		&s.EmailContatoSecundario,
		&s.Logradouro,
		&s.Numero,
		&s.Complemento,
		&s.Bairro,
		&s.CodigoCidade,
		&s.Cidade,
		&s.UF,
		&s.Observacoes,
		&s.Ativo,
	)
	if err != nil {
		http.Error(w, "erro ao buscar fornecedor atualizado: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s)
}

// -----------------------------------------------------------------------------
// DELETE /suppliers/{id}
// -----------------------------------------------------------------------------

func (h *SupplierHandler) DeleteSupplier(
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
		delete from suppliers
		 where id = $1
		   and tenant_id = $2
	`, id, tenantID)
	if err != nil {
		http.Error(w, "erro ao excluir fornecedor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	aff, _ := res.RowsAffected()
	if aff == 0 {
		http.Error(w, "fornecedor não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
