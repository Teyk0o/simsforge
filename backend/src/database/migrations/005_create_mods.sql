-- Create mods table
CREATE TABLE IF NOT EXISTS mods (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'removed')),
    access_type VARCHAR(20) DEFAULT 'free' CHECK (access_type IN ('free', 'early_access')),
    early_access_price DECIMAL(10, 2),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    featured_priority INTEGER,
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT valid_early_access_price CHECK (
        (access_type = 'early_access' AND early_access_price > 0) OR
        (access_type = 'free' AND early_access_price IS NULL)
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mods_creator_id ON mods(creator_id);
CREATE INDEX IF NOT EXISTS idx_mods_status ON mods(status);
CREATE INDEX IF NOT EXISTS idx_mods_access_type ON mods(access_type);
CREATE INDEX IF NOT EXISTS idx_mods_slug ON mods(slug);
CREATE INDEX IF NOT EXISTS idx_mods_featured ON mods(featured, featured_priority);
CREATE INDEX IF NOT EXISTS idx_mods_published_at ON mods(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mods_download_count ON mods(download_count DESC);
