-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for creator_profiles table
CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mods table
CREATE TRIGGER update_mods_updated_at BEFORE UPDATE ON mods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment mod download count
CREATE OR REPLACE FUNCTION increment_mod_download_count(mod_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Increment mod download count
    UPDATE mods SET download_count = download_count + 1 WHERE id = mod_id_param;

    -- Increment recommended version download count
    UPDATE mod_versions SET download_count = download_count + 1
    WHERE id = (
        SELECT id FROM mod_versions
        WHERE mod_id = mod_id_param AND is_recommended = TRUE
        LIMIT 1
    );

    -- Increment creator total downloads
    UPDATE creator_profiles SET total_downloads = total_downloads + 1
    WHERE user_id = (SELECT creator_id FROM mods WHERE id = mod_id_param);
END;
$$ LANGUAGE plpgsql;
