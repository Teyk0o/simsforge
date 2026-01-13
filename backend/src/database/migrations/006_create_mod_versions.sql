-- Create mod_versions table
CREATE TABLE IF NOT EXISTS mod_versions (
    id SERIAL PRIMARY KEY,
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    changelog TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    is_recommended BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mod_id, version_number)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mod_versions_mod_id ON mod_versions(mod_id);
CREATE INDEX IF NOT EXISTS idx_mod_versions_is_recommended ON mod_versions(mod_id, is_recommended);
CREATE INDEX IF NOT EXISTS idx_mod_versions_created_at ON mod_versions(created_at DESC);
