CREATE TABLE IF NOT EXISTS suppliers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  codigo              TEXT NOT NULL,
  nome                TEXT NOT NULL,

  tipo                TEXT NOT NULL CHECK (tipo IN ('fisica', 'juridica')),

  -- documentos (PF / PJ)
  cpf                 TEXT,
  rg                  TEXT,
  cnpj                TEXT,
  inscricao_estadual  TEXT,

  -- contato principal
  nome_contato_principal      TEXT,
  telefone_contato_principal  TEXT,
  email_contato_principal     TEXT,

  -- contato secundário / endereço
  cep                 TEXT,
  nome_contato_secundario     TEXT,
  telefone_contato_secundario TEXT,
  email_contato_secundario    TEXT,
  logradouro          TEXT,
  numero              TEXT,
  complemento         TEXT,
  bairro              TEXT,

  -- localização
  codigo_cidade       TEXT,
  cidade              TEXT NOT NULL,
  uf                  CHAR(2) NOT NULL,

  -- outros
  observacoes         TEXT,

  ativo               BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- código único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_tenant_codigo
  ON suppliers (tenant_id, codigo);

-- índice útil pra listagem por nome dentro do tenant
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_nome
  ON suppliers (tenant_id, nome);

-- índice simples pra filtros por ativo
CREATE INDEX IF NOT EXISTS idx_suppliers_ativo
  ON suppliers (ativo);
