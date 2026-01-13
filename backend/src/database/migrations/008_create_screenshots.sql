-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    id SERIAL PRIMARY KEY,
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_screenshots_mod_id ON screenshots(mod_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_display_order ON screenshots(mod_id, display_order);
