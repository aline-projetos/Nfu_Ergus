-- 000X_create_manufacturers.up.sql

CREATE TABLE IF NOT EXISTS manufacturers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Identificação
  codigo              TEXT NOT NULL,
  nome                TEXT NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('fisica', 'juridica')),

  cnpj                TEXT,
  inscricao_estadual  TEXT,

  -- Contato principal
  contato_principal_nome      TEXT,
  contato_principal_telefone TEXT,
  contato_principal_email    TEXT,

  -- Contato secundário / endereço
  contato_secundario_nome      TEXT,
  contato_secundario_telefone TEXT,
  contato_secundario_email    TEXT,

  cep                 TEXT,
  logradouro          TEXT,
  numero              TEXT,
  complemento         TEXT,
  bairro              TEXT,

  -- Localização
  codigo_cidade       TEXT,
  cidade              TEXT NOT NULL,
  uf                  CHAR(2) NOT NULL,

  -- Outros
  observacoes         TEXT,

  ativo               BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Código único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS ux_manufacturers_tenant_codigo
  ON manufacturers (tenant_id, codigo);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_manufacturers_tenant_nome
  ON manufacturers (tenant_id, nome);

CREATE INDEX IF NOT EXISTS idx_manufacturers_ativo
  ON manufacturers (ativo);
