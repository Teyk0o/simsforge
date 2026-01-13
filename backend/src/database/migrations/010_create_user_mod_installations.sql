-- Create user_mod_installations table
CREATE TABLE IF NOT EXISTS user_mod_installations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    version_id INTEGER NOT NULL REFERENCES mod_versions(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mod_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_mod_installations_user_id ON user_mod_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mod_installations_mod_id ON user_mod_installations(mod_id);
