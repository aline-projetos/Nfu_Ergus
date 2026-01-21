-- 0004_add_user_email_to_users.up.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS useremail TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_tenant_email
ON users (tenant_id, useremail)
WHERE tenant_id IS NOT NULL;