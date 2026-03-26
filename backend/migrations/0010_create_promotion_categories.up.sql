-- 0009_create_promotion_categories.up.sql
CREATE TABLE IF NOT EXISTS promotion_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  promotion_id  UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- uma categoria não pode ser ligada 2x à mesma promo (dentro do mesmo tenant)
CREATE UNIQUE INDEX IF NOT EXISTS ux_promotion_categories_unique
  ON promotion_categories (tenant_id, promotion_id, category_id);

-- índices úteis
CREATE INDEX IF NOT EXISTS idx_promotion_categories_promotion
  ON promotion_categories (tenant_id, promotion_id);

CREATE INDEX IF NOT EXISTS idx_promotion_categories_category
  ON promotion_categories (tenant_id, category_id);
