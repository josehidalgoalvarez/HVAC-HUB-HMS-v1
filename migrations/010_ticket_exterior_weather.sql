-- Migration 010: Ticket Exterior Work and Weather Notes (Batch B)
-- Adds exterior_work toggle and weather_note text field to ticket table for manual weather watches.

ALTER TABLE `ticket`
  ADD `exterior_work` TINYINT(1) NOT NULL DEFAULT 0,
  ADD `weather_note` TEXT NULL;
