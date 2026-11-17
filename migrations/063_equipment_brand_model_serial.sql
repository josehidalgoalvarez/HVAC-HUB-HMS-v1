-- Migration 063: Equipment Rating-Plate Columns
-- Adds brand, model_number, and serial_number to equipment.

ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS brand TEXT NULL,
    ADD COLUMN IF NOT EXISTS model_number TEXT NULL,
    ADD COLUMN IF NOT EXISTS serial_number TEXT NULL;
