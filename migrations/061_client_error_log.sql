-- Migration 061: Client Error Log
-- Captures React ErrorBoundary, window.onerror, and unhandledrejection errors for MCP inspection.

CREATE TABLE IF NOT EXISTS client_error_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    stack TEXT NULL,
    component_stack TEXT NULL,
    route VARCHAR(255) NULL,
    app_version VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_error_log_created_at (created_at),
    INDEX idx_client_error_log_source_created_at (source, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
