-- Create mod_categories junction table
CREATE TABLE IF NOT EXISTS mod_categories (
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (mod_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_mod_categories_category_id ON mod_categories(category_id);

-- Create mod_tags junction table
CREATE TABLE IF NOT EXISTS mod_tags (
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (mod_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_mod_tags_tag_id ON mod_tags(tag_id);
