-- 0002_create_categories.up.sql

CREATE TABLE IF NOT EXISTS categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  parent_code      TEXT,
  parent_name      TEXT,
  meta_title       TEXT,
  meta_tag         TEXT,
  meta_description TEXT,
  site_order       INT,
  site_link        TEXT,
  description      TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- código único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_tenant_code
  ON categories (tenant_id, code);

-- índice útil pra listagem
CREATE INDEX IF NOT EXISTS idx_categories_tenant_name
  ON categories (tenant_id, name);

-- trigger de updated_at (usa a set_timestamp criada na 0001)
DROP TRIGGER IF EXISTS trg_categories_set_timestamp ON categories;
CREATE TRIGGER trg_categories_set_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();
