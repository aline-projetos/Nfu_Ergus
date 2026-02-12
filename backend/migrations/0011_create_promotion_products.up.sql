-- 0010_create_promotion_products.up.sql
CREATE TABLE IF NOT EXISTS promotion_products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  promotion_id  UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_promotion_products_unique
  ON promotion_products (tenant_id, promotion_id, product_id);

CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion
  ON promotion_products (tenant_id, promotion_id);

CREATE INDEX IF NOT EXISTS idx_promotion_products_product
  ON promotion_products (tenant_id, product_id);
