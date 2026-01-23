CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ NULL,

    -- opcional, mas muito útil
    user_agent TEXT,
    ip_address INET
);

-- índice para acelerar validação
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
