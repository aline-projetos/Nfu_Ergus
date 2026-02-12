-- 0002_init_core_schema.up.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- Função para updated_at
-- =========================================
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- TENANTS
-- =========================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT        NOT NULL,
    document        VARCHAR(14) NOT NULL,
    document_type   CHAR(4)     NOT NULL,
    ativo           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tenants_document_type_chk
        CHECK (document_type IN ('CPF', 'CNPJ')),
    CONSTRAINT tenants_document_format_chk
        CHECK (document ~ '^[0-9]{11}$' OR document ~ '^[0-9]{14}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenants_document
    ON tenants (document);

DROP TRIGGER IF EXISTS trg_tenants_set_timestamp ON tenants;

CREATE TRIGGER trg_tenants_set_timestamp
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();


-- =========================================
-- USERS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    codigo          INTEGER NULL,
    username        TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    type            TEXT NOT NULL,
    is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    token_hash      TEXT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    useremail       TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username
    ON users (username);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_tenant_codigo
    ON users (tenant_id, codigo)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant_id
    ON users (tenant_id);

DROP TRIGGER IF EXISTS trg_users_set_timestamp ON users;

CREATE TRIGGER trg_users_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();


-- =========================================
-- SEQUÊNCIA DE CÓDIGO DE USUÁRIO POR TENANT
-- =========================================
CREATE TABLE IF NOT EXISTS tenant_user_sequences (
    tenant_id   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    next_codigo INTEGER NOT NULL
);
