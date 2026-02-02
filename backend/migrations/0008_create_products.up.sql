-- 0006_create_products.up.sql
CREATE TABLE IF NOT EXISTS products (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  code       TEXT NOT NULL,
  name       TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- código único por tenant (já casa com o padrão de categories / promotions)
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_tenant_code
  ON products (tenant_id, code);

DROP TRIGGER IF EXISTS trg_products_set_timestamp ON products;
CREATE TRIGGER trg_products_set_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();
