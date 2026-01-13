-- Create early_access_purchases table
CREATE TABLE IF NOT EXISTS early_access_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mod_id INTEGER NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10, 2) NOT NULL,
    platform_commission DECIMAL(10, 2) NOT NULL,
    creator_revenue DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_provider VARCHAR(50),
    payment_provider_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, mod_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_early_access_purchases_user_id ON early_access_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_early_access_purchases_mod_id ON early_access_purchases(mod_id);
CREATE INDEX IF NOT EXISTS idx_early_access_purchases_payment_status ON early_access_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_early_access_purchases_created_at ON early_access_purchases(created_at DESC);
