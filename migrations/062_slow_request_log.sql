-- Migration 062: Slow Request Log
-- Captures API requests taking >= 1000ms for MCP performance inspection.

CREATE TABLE IF NOT EXISTS slow_request_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    route VARCHAR(255) NOT NULL,
    duration_ms INT NOT NULL,
    status_code INT NULL,
    user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slow_request_log_created_at (created_at),
    INDEX idx_slow_request_log_route_created_at (route, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
