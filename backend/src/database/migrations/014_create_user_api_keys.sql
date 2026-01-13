/**
 * Migration: Create user_api_keys table
 * Purpose: Store encrypted API keys for third-party services (CurseForge, Patreon, etc.)
 * Date: 2026-01-10
 */

CREATE TABLE user_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL CHECK (service_name IN ('curseforge', 'patreon')),
    api_key_encrypted TEXT NOT NULL,
    iv VARCHAR(32) NOT NULL,
    auth_tag VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, service_name)
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_service ON user_api_keys(service_name);
