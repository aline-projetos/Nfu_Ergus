-- 0008_create_promotions.up.sql

CREATE TABLE IF NOT EXISTS promotions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  description      TEXT,
  discount_type    TEXT NOT NULL,
  discount_value   NUMERIC NOT NULL,
  apply_fix_cents  BOOLEAN NOT NULL DEFAULT FALSE,
  fix_value_cents  NUMERIC NOT NULL DEFAULT 0,
  
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promotion_type_chk
        CHECK (type IN ('Adiciona Valor', 'Subtrai Valor')),
  CONSTRAINT discount_type_chk
        CHECK (discount_type IN ('porcentagem', 'valor fixo'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_promotions_tenant_code
  ON promotions (tenant_id, code);


CREATE INDEX IF NOT EXISTS idx_promotions_tenant_name
  ON promotions (tenant_id, name);


DROP TRIGGER IF EXISTS trg_promotions_set_timestamp ON promotions;
CREATE TRIGGER trg_promotions_set_timestamp
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();
