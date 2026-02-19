-- 0014_products_full_with_variations_and_images.up.sql
-- ============================================================
-- OBJETIVO
-- - Products vira "produto pai / agrupador" (herda infos)
-- - SKU real SEMPRE é uma variação (product_variations)
--   -> Produto simples = 1 variação "DEFAULT"
-- - Imagens SEMPRE na variação (product_variation_images)
-- ============================================================

-- ============================================================
-- 2) Tabela de variações (SKU real)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_variations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- regra: produto simples vira uma única variação DEFAULT
  combination      TEXT NOT NULL DEFAULT 'DEFAULT',

  -- ✅ novo: marca default de verdade (seu handler usa isso)
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,

  -- SKU/identificadores reais
  sku             TEXT NOT NULL,
  ean             TEXT,

  -- preço/custo sempre por SKU (variação)
  price           NUMERIC(12,2),
  cost_price      NUMERIC(12,2),

  -- dimensões específicas (se NULL, herda do products)
  weight          NUMERIC(12,3),
  length          NUMERIC(12,3),
  height          NUMERIC(12,3),
  width           NUMERIC(12,3),

  -- campos que podem sobrescrever o pai (se NULL, herda do products)
  short_description TEXT,
  long_description  TEXT,
  meta_title        TEXT,
  meta_tag          TEXT,
  meta_description  TEXT,

  active          BOOLEAN NOT NULL DEFAULT TRUE,

  -- ✅ novo: detalhes livres por variação (modal do front)
  details         JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_product_variations_set_timestamp ON product_variations;
CREATE TRIGGER trg_product_variations_set_timestamp
BEFORE UPDATE ON product_variations
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();

-- Uniques e índices
-- SKU único por tenant (SKU é a identidade do item vendável)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_variations_tenant_sku
  ON product_variations (tenant_id, sku);

-- Uma combinação não pode se repetir dentro do mesmo produto (por tenant)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_variations_tenant_product_combination
  ON product_variations (tenant_id, product_id, combination);

-- ✅ garante 1 default por produto (por tenant)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_variations_one_default_per_product
  ON product_variations (tenant_id, product_id)
  WHERE is_default = TRUE;

-- Índices para listagens
CREATE INDEX IF NOT EXISTS idx_product_variations_tenant_product
  ON product_variations (tenant_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_variations_tenant_active
  ON product_variations (tenant_id, active);

-- (Opcional, mas MUITO recomendado) Garantir que tenant_id da variação bata com tenant_id do produto pai
-- Isso evita “cross-tenant link” por erro de código.
CREATE OR REPLACE FUNCTION enforce_product_variation_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  prod_tenant UUID;
BEGIN
  SELECT tenant_id INTO prod_tenant
    FROM products
   WHERE id = NEW.product_id;

  IF prod_tenant IS NULL THEN
    RAISE EXCEPTION 'Produto pai não encontrado para product_id=%', NEW.product_id;
  END IF;

  IF prod_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Tenant mismatch: variation.tenant_id(%) != product.tenant_id(%)', NEW.tenant_id, prod_tenant;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_variations_tenant_match ON product_variations;
CREATE TRIGGER trg_product_variations_tenant_match
BEFORE INSERT OR UPDATE ON product_variations
FOR EACH ROW
EXECUTE FUNCTION enforce_product_variation_tenant_match();


-- ✅ Backfill (se existir base antiga):
-- tudo que já for DEFAULT vira is_default = true
UPDATE product_variations
   SET is_default = TRUE
 WHERE combination = 'DEFAULT'
   AND is_default = FALSE;


-- ============================================================
-- 3) Imagens (sempre por variação)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_variation_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  variation_id  UUID NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,

  url          TEXT NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  position     INT,
  description TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_variation_images_tenant_variation
  ON product_variation_images (tenant_id, variation_id);

CREATE INDEX IF NOT EXISTS idx_product_variation_images_tenant_position
  ON product_variation_images (tenant_id, position);

-- 1 imagem primária por variação (única)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_variation_images_primary
  ON product_variation_images (variation_id)
  WHERE is_primary = TRUE;

-- (Opcional) Garantir tenant_id da imagem = tenant_id da variação
CREATE OR REPLACE FUNCTION enforce_variation_image_tenant_match()
RETURNS TRIGGER AS $$
DECLARE
  var_tenant UUID;
BEGIN
  SELECT tenant_id INTO var_tenant
    FROM product_variations
   WHERE id = NEW.variation_id;

  IF var_tenant IS NULL THEN
    RAISE EXCEPTION 'Variação não encontrada para variation_id=%', NEW.variation_id;
  END IF;

  IF var_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Tenant mismatch: image.tenant_id(%) != variation.tenant_id(%)', NEW.tenant_id, var_tenant;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_variation_images_tenant_match ON product_variation_images;
CREATE TRIGGER trg_product_variation_images_tenant_match
BEFORE INSERT OR UPDATE ON product_variation_images
FOR EACH ROW
EXECUTE FUNCTION enforce_variation_image_tenant_match();


-- ============================================================
-- 4) Observação prática (importante)
-- ============================================================
-- A regra "produto simples vira uma única variação" normalmente é aplicada no backend:
-- - POST /products cria products
-- - em seguida cria 1 row em product_variations com combination='DEFAULT' e sku do frontend
-- Você pode fazer via trigger também, mas recomendo no backend pra manter controle (sku obrigatório).
-- ============================================================
