/**
 * Migration: Create migrations tracking table
 * Purpose: Track which migrations have been executed
 * This must run first before any other migrations
 */

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
