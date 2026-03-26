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
-- Observação
-- ============================================================
-- Índices criados com CREATE INDEX IF NOT EXISTS
-- serão automaticamente removidos junto com as tabelas.
-- ============================================================
