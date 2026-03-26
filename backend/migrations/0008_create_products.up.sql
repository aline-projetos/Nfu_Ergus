-- 0006_create_products.up.sql
CREATE TABLE IF NOT EXISTS products (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  code       TEXT NOT NULL,
  name       TEXT NOT NULL,

  reference         TEXT,
  unit              TEXT,
  short_description TEXT,
  long_description  TEXT,
  meta_title        TEXT,
  meta_tag          TEXT,
  meta_description  TEXT,
  video_link        TEXT,
  other_links       TEXT,

  weight            NUMERIC(12,3),
  length            NUMERIC(12,3),
  height            NUMERIC(12,3),
  width             NUMERIC(12,3),

  category_id     UUID REFERENCES categories(id)     ON DELETE SET NULL,
  supplier_id     UUID REFERENCES suppliers(id)      ON DELETE SET NULL,
  manufacturer_id UUID REFERENCES manufacturers(id)  ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_tenant_code
  ON products (tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_products_tenant_category
  ON products (tenant_id, category_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_supplier
  ON products (tenant_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_manufacturer
  ON products (tenant_id, manufacturer_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_name
  ON products (tenant_id, name);

DROP TRIGGER IF EXISTS trg_products_set_timestamp ON products;
CREATE TRIGGER trg_products_set_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();
