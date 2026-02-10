-- 0013_create_taxation.up.sql
-- Módulo de Tributação básico do Ergus

-- =====================================================================
-- 1) ENUM de origem fiscal
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiscal_origin_type') THEN
    CREATE TYPE fiscal_origin_type AS ENUM (
      '0', -- Nacional
      '1', -- Estrangeira - Importação direta
      '2', -- Estrangeira - Adquirida no mercado interno
      '3', -- Nacional - Conteúdo de importação superior a 40%
      '4', -- Nacional - Conteúdo de importação inferior ou igual a 40%
      '5', -- Nacional - Produção em conformidade com processos produtivos básicos
      '6', -- Estrangeira - Importação direta, sem similar nacional
      '7', -- Estrangeira - Adquirida no mercado interno, sem similar nacional
      '8'  -- Nacional - Conteúdo de importação superior a 70%
    );
  END IF;
END
$$;

-- =====================================================================
-- 2) Tabelas normativas (globais, sem tenant)
-- =====================================================================

-- NCM
CREATE TABLE IF NOT EXISTS ncm_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(8) NOT NULL UNIQUE,  -- ex: 33049990
  description TEXT NOT NULL,
  ex_version  VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- índice para busca rápida por descrição (ILIKE '%texto%')
CREATE INDEX IF NOT EXISTS idx_ncm_codes_description
  ON ncm_codes USING GIN (to_tsvector('simple', description));

-- CEST
CREATE TABLE IF NOT EXISTS cest_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(7) NOT NULL UNIQUE,  -- ex: 2803800
  description TEXT NOT NULL,
  ncm_code    VARCHAR(8),                  -- NCM principal vinculado (opcional)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cest_codes_description
  ON cest_codes USING GIN (to_tsvector('simple', description));

-- CFOP
CREATE TABLE IF NOT EXISTS cfops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(4) NOT NULL UNIQUE,  -- ex: 5102
  description TEXT NOT NULL,
  type        VARCHAR(20),                 -- 'venda', 'compra', 'devolucao', etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3) Tabela de Grupos de Tributação (por tenant)
-- =====================================================================

CREATE TABLE IF NOT EXISTS tax_groups (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  code           TEXT NOT NULL,
  name           TEXT NOT NULL,

  regime         TEXT NOT NULL,        -- 'simples_nacional', 'lucro_presumido', 'lucro_real'
  tipo_produto   TEXT NOT NULL,        -- 'revenda', 'industrializacao', 'servico', etc.

  use_icms_st    BOOLEAN NOT NULL DEFAULT FALSE,
  use_pis_cofins BOOLEAN NOT NULL DEFAULT TRUE,
  use_iss        BOOLEAN NOT NULL DEFAULT FALSE,

  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tax_groups_tenant_code
  ON tax_groups (tenant_id, code);

-- Opcional: se você já tiver a função set_timestamp() definida
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_timestamp'
  ) THEN
    CREATE TRIGGER trg_tax_groups_set_timestamp
      BEFORE UPDATE ON tax_groups
      FOR EACH ROW
      EXECUTE PROCEDURE set_timestamp();
  END IF;
END
$$;

-- =====================================================================
-- 4) Perfis de Operação (Natureza da operação por tenant)
-- =====================================================================

CREATE TABLE IF NOT EXISTS operation_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  code           TEXT NOT NULL,
  name           TEXT NOT NULL,

  cfop_id        UUID REFERENCES cfops(id),

  doc_type       TEXT NOT NULL,   -- 'nfe', 'nfce', 'cte', etc.
  operation_kind TEXT NOT NULL,   -- 'venda', 'devolucao', 'bonificacao', etc.

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_operation_profiles_tenant_code
  ON operation_profiles (tenant_id, code);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_timestamp'
  ) THEN
    CREATE TRIGGER trg_operation_profiles_set_timestamp
      BEFORE UPDATE ON operation_profiles
      FOR EACH ROW
      EXECUTE PROCEDURE set_timestamp();
  END IF;
END
$$;

-- =====================================================================
-- 5) Regras de ICMS por grupo + operação + UF
-- =====================================================================

CREATE TABLE IF NOT EXISTS tax_group_icms_rules (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  tax_group_id          UUID NOT NULL REFERENCES tax_groups(id) ON DELETE CASCADE,
  operation_profile_id  UUID NOT NULL REFERENCES operation_profiles(id) ON DELETE CASCADE,

  uf_origin             CHAR(2) NOT NULL,
  uf_dest               CHAR(2) NOT NULL,

  destinatario_contribuinte BOOLEAN NOT NULL,

  -- Campos de ICMS
  cst                   VARCHAR(3),         -- para regime normal
  csosn                 VARCHAR(3),         -- para simples nacional
  mod_bc                SMALLINT,           -- 0=Preço, 1=Lista, etc
  aliq_icms             NUMERIC(5,2),
  red_base_icms         NUMERIC(5,2),       -- redução base (%)

  -- ST
  mod_bc_st             SMALLINT,
  aliq_icms_st          NUMERIC(5,2),
  mva_st                NUMERIC(5,2),

  -- FCP
  aliq_fcp              NUMERIC(5,2),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- índice para bater regra rapidamente na consulta
CREATE INDEX IF NOT EXISTS idx_icms_rules_match
  ON tax_group_icms_rules (
    tenant_id,
    tax_group_id,
    operation_profile_id,
    uf_origin,
    uf_dest,
    destinatario_contribuinte
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_timestamp'
  ) THEN
    CREATE TRIGGER trg_tax_group_icms_rules_set_timestamp
      BEFORE UPDATE ON tax_group_icms_rules
      FOR EACH ROW
      EXECUTE PROCEDURE set_timestamp();
  END IF;
END
$$;

-- =====================================================================
-- 6) Regras de PIS/COFINS por grupo + operação
-- =====================================================================

CREATE TABLE IF NOT EXISTS tax_group_pis_cofins_rules (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  tax_group_id          UUID NOT NULL REFERENCES tax_groups(id) ON DELETE CASCADE,
  operation_profile_id  UUID NOT NULL REFERENCES operation_profiles(id) ON DELETE CASCADE,

  -- PIS
  pis_cst               VARCHAR(3),
  pis_aliq              NUMERIC(5,2),
  pis_tipo_calculo      TEXT DEFAULT 'percentual',  -- 'percentual' | 'valor'

  -- COFINS
  cofins_cst            VARCHAR(3),
  cofins_aliq           NUMERIC(5,2),
  cofins_tipo_calculo   TEXT DEFAULT 'percentual',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pis_cofins_rules_match
  ON tax_group_pis_cofins_rules (
    tenant_id,
    tax_group_id,
    operation_profile_id
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_timestamp'
  ) THEN
    CREATE TRIGGER trg_tax_group_pis_cofins_rules_set_timestamp
      BEFORE UPDATE ON tax_group_pis_cofins_rules
      FOR EACH ROW
      EXECUTE PROCEDURE set_timestamp();
  END IF;
END
$$;

-- =====================================================================
-- 7) Ajuste da tabela products para referenciar tributação
-- =====================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tax_group_id   UUID REFERENCES tax_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ncm_id         UUID REFERENCES ncm_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cest_id        UUID REFERENCES cest_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_origin  fiscal_origin_type NOT NULL DEFAULT '0';

-- índice útil para listar produtos por grupo fiscal
CREATE INDEX IF NOT EXISTS idx_products_tax_group
  ON products (tenant_id, tax_group_id);
