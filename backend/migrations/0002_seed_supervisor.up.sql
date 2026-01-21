-- 002_seed_supervisor.sql
-- Seed idempotente do usuário supervisor (global)

DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    SELECT id INTO existing_user_id
    FROM users
    WHERE username = 'supervisor';

    IF existing_user_id IS NULL THEN
        INSERT INTO users (
            tenant_id,
            codigo,
            username,
            password_hash,
            type,
            is_super_admin,
            token_hash,
            ativo
        ) VALUES (
            NULL,                   -- supervisor é global, não pertence a um tenant
            NULL,                   -- supervisor não precisa de código funcional
            'supervisor',
            '$2a$10$WfQoNmV3PDUuVAS.cj4nQ.uote9Kdd7uujPxlSCTcQLiqSaeGIHXW',
            'admin',
            TRUE,
            '$2a$10$h1/8QXV7ZLPMTAaq5NjqM.bjmQefc2gZi/91mK1m6Ye3mStJTfnXO',
            TRUE
        );
    END IF;
END;
$$;
