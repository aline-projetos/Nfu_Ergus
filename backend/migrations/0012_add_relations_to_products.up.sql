-- 0012_add_relations_to_products.up.sql

ALTER TABLE products
  ADD COLUMN category_id     UUID REFERENCES categories(id)     ON DELETE SET NULL,
  ADD COLUMN supplier_id     UUID REFERENCES suppliers(id)      ON DELETE SET NULL,
  ADD COLUMN manufacturer_id UUID REFERENCES manufacturers(id)  ON DELETE SET NULL;

-- índices úteis por tenant
CREATE INDEX IF NOT EXISTS idx_products_tenant_category
  ON products (tenant_id, category_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_supplier
  ON products (tenant_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_manufacturer
  ON products (tenant_id, manufacturer_id);
