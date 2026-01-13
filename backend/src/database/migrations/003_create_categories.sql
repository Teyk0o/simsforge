-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Pre-populate categories
INSERT INTO categories (name, slug, description, display_order) VALUES
    ('Gameplay', 'gameplay', 'Gameplay modifications and enhancements', 1),
    ('CAS', 'cas', 'Create-a-Sim content', 2),
    ('Build & Buy', 'build-buy', 'Build and Buy mode objects', 3),
    ('Bug Fixes', 'bugfix', 'Bug fixes and patches', 4),
    ('UI', 'ui', 'User interface modifications', 5),
    ('Traits', 'traits', 'New traits and aspirations', 6),
    ('Careers', 'careers', 'Career modifications', 7),
    ('Other', 'other', 'Miscellaneous mods', 99)
ON CONFLICT (name) DO NOTHING;
