-- 0014_products_full_with_variations_and_images.down.sql
-- ============================================================
-- ROLLBACK COMPLETO DA 0014
-- ============================================================

-- ============================================================
-- 1) Remover triggers e funções de images
-- ============================================================

DROP TRIGGER IF EXISTS trg_product_variation_images_tenant_match
ON product_variation_images;

DROP FUNCTION IF EXISTS enforce_variation_image_tenant_match;


-- ============================================================
-- 2) Remover tabela product_variation_images
-- ============================================================

DROP TABLE IF EXISTS product_variation_images;


-- ============================================================
-- 3) Remover triggers e funções de product_variations
-- ============================================================

DROP TRIGGER IF EXISTS trg_product_variations_tenant_match
ON product_variations;

DROP TRIGGER IF EXISTS trg_product_variations_set_timestamp
ON product_variations;

DROP FUNCTION IF EXISTS enforce_product_variation_tenant_match;


-- ============================================================
-- 4) Remover tabela product_variations
-- ============================================================

DROP TABLE IF EXISTS product_variations;


-- ============================================================
-- 5) Remover colunas adicionadas em products
-- ============================================================

ALTER TABLE products
  DROP COLUMN IF EXISTS reference,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS short_description,
  DROP COLUMN IF EXISTS long_description,
  DROP COLUMN IF EXISTS meta_title,
  DROP COLUMN IF EXISTS meta_tag,
  DROP COLUMN IF EXISTS meta_description,
  DROP COLUMN IF EXISTS video_link,
  DROP COLUMN IF EXISTS other_links,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS length,
  DROP COLUMN IF EXISTS height,
  DROP COLUMN IF EXISTS width;


-- ============================================================
-- Observação
-- ============================================================
-- Índices criados com CREATE INDEX IF NOT EXISTS
-- serão automaticamente removidos junto com as tabelas.
-- ============================================================
