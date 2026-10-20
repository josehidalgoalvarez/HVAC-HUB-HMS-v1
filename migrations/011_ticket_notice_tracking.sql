-- Migration 011: Ticket Notice Tracking (Batch A-revised)
-- Adds notice_needed, notice_sent_at, and notice_confirmed_by to ticket table
-- for sent-tracking only workflow on the work order.

ALTER TABLE `ticket`
  ADD `notice_needed` TINYINT(1) NOT NULL DEFAULT 0,
  ADD `notice_sent_at` DATETIME NULL,
  ADD `notice_confirmed_by` VARCHAR(150) NULL;
