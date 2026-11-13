-- Migration 057: Drop legacy singular complex table
-- The legacy Phase 0 complex table (12 rows, TEXT ids) is superseded by
-- canonical complexes (10 rows, INTEGER ids 1..10). Nothing reads complex.

DROP TABLE IF EXISTS `complex`;
