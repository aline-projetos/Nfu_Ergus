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

-- =========================================
-- PERFIS E PERMISSÕES
-- =========================================

-- TABELA DE PERMISSÕES (GLOBAL)
-- Ex.: products.view, products.edit, sales.create, etc.
CREATE TABLE IF NOT EXISTS access_permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT        NOT NULL, -- ex.: 'products.view'
    name        TEXT        NOT NULL, -- ex.: 'Visualizar produtos'
    module      TEXT        NOT NULL, -- ex.: 'products', 'sales', 'finance'
    description TEXT        NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_access_permissions_code
    ON access_permissions (code);

DROP TRIGGER IF EXISTS trg_access_permissions_set_timestamp ON access_permissions;

CREATE TRIGGER trg_access_permissions_set_timestamp
BEFORE UPDATE ON access_permissions
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();


-- TABELA DE PERFIS (GRUPOS DE ACESSO) POR TENANT
-- Ex.: 'Administrador', 'Financeiro', 'Vendas Externas'
CREATE TABLE IF NOT EXISTS access_profiles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code        TEXT        NOT NULL, -- ex.: 'admin', 'financeiro', 'vendedor'
    name        TEXT        NOT NULL, -- nome amigável para exibir na UI
    description TEXT        NULL,
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE, -- perfil padrão do tenant (opcional)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dentro de um tenant, o code do perfil deve ser único
CREATE UNIQUE INDEX IF NOT EXISTS ux_access_profiles_tenant_code
    ON access_profiles (tenant_id, code);

-- Índice de busca por tenant
CREATE INDEX IF NOT EXISTS idx_access_profiles_tenant
    ON access_profiles (tenant_id);

DROP TRIGGER IF EXISTS trg_access_profiles_set_timestamp ON access_profiles;

CREATE TRIGGER trg_access_profiles_set_timestamp
BEFORE UPDATE ON access_profiles
FOR EACH ROW
EXECUTE FUNCTION set_timestamp();


-- TABELA N:N ENTRE PERFIS E PERMISSÕES
-- Define quais permissões um perfil tem
CREATE TABLE IF NOT EXISTS access_profile_permissions (
    profile_id    UUID NOT NULL REFERENCES access_profiles(id)    ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES access_permissions(id) ON DELETE RESTRICT,
    PRIMARY KEY (profile_id, permission_id)
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_app_profile_permissions_profile
    ON access_profile_permissions (profile_id);

CREATE INDEX IF NOT EXISTS idx_app_profile_permissions_permission
    ON access_profile_permissions (permission_id);


-- TABELA N:N ENTRE USUÁRIOS E PERFIS
-- Um usuário pode ter um ou mais perfis dentro do tenant
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id    UUID NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES access_profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user
    ON user_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_profile
    ON user_profiles (profile_id);
