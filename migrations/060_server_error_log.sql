-- Migration 060: Server Error Log
-- Captures uncaught PHP exceptions, warnings, and fatal errors for MCP inspection.

CREATE TABLE IF NOT EXISTS server_error_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    file VARCHAR(255) NULL,
    line INT NULL,
    route VARCHAR(255) NULL,
    user_id INT NULL,
    context TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_server_error_log_created_at (created_at),
    INDEX idx_server_error_log_level_created_at (level, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
