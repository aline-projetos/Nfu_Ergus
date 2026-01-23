-- 0006_create_products.up.sql

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Identificação básica
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,

  -- SEO / Meta
  meta_title       TEXT,
  meta_tag         TEXT,
  meta_description TEXT,

  -- Referência / categoria
  reference      TEXT,
  category_code  UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name  TEXT,

  -- Preços (no produto, hoje seu Go já usa assim)
  cost_price   NUMERIC(12,2),
  sale_price   NUMERIC(12,2),

  -- Identificadores e medidas
  sku          INTEGER,
  ean          TEXT,
  weight       TEXT,
  length       TEXT,
  height       TEXT,
  width        TEXT,
  ncm          TEXT,

  -- Descrições
  unit              TEXT,
  short_description TEXT,
  long_description  TEXT,

  -- Regra Comercial
  promotion_code   TEXT,
  promotion_name   TEXT,
  promotion_start  INTEGER, -- *int no Go
  promotion_end    TEXT,    -- *string no Go

  -- 🔹 TRIBUTAÇÃO (no produto)
  tax_group          TEXT,
  ncm_code           TEXT,
  ncm_description    TEXT,
  cest_code          TEXT,
  cest_description   TEXT,
  pis_code           TEXT,
  pis_description    TEXT,
  cofins_code        TEXT,
  cofins_description TEXT,
  fiscal_origin      TEXT,

  -- 🔹 Campos de variação SIMPLES (modelo atual do Go)
  variation_type       TEXT,
  variation_type_code  TEXT,
  variation_sku        TEXT,
  variation_ean        TEXT,
  variation_weight     TEXT,
  variation_length     TEXT,
  variation_height     TEXT,
  variation_width      TEXT,
  variation_short_desc TEXT,
  variation_long_desc  TEXT,
  variation_meta_title TEXT,
  variation_meta_tag   TEXT,
  variation_meta_desc  TEXT,
  variation_image_link TEXT,

  -- Mídia extra
  video_link   TEXT,
  other_links  TEXT,

  -- Organização
  site_order   INTEGER,

  -- Auditoria
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- código único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_tenant_code
  ON products (tenant_id, code);

-- índice útil pra listagem por nome
CREATE INDEX IF NOT EXISTS idx_products_tenant_name
  ON products (tenant_id, name);

-- índice por tenant + categoria
CREATE INDEX IF NOT EXISTS idx_products_tenant_category_code
  ON products (tenant_id, category_code);

-- trigger de updated_at (usa a set_timestamp criada na 0001)
DROP TRIGGER IF EXISTS trg_products_set_timestamp ON products;

CREATE TRIGGER trg_products_set_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();
