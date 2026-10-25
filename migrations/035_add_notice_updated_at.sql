-- Migration 035: Add updated_at column to notice table if missing
-- Ensures parity between MySQL and SQLite schema for Notice::create and Notice::update

ALTER TABLE `notice`
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;
