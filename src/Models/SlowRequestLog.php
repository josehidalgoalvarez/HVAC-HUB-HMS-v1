<?php
declare(strict_types=1);

namespace App\Models;

use App\Db;
use PDO;

class SlowRequestLog
{
    /**
     * Best-effort insert of one slow request row + 30-day retention cleanup.
     * Never throws; logging failures must never break the request.
     */
    public static function log(array $row): void
    {
        try {
            $method = substr((string) ($row['method'] ?? 'GET'), 0, 10);
            $route = substr((string) ($row['route'] ?? '/'), 0, 255);
            $durationMs = (int) ($row['duration_ms'] ?? 0);
            $statusCode = isset($row['status_code']) ? (int) $row['status_code'] : null;
            $userId = isset($row['user_id']) ? (int) $row['user_id'] : null;

            Db::execute(
                'INSERT INTO slow_request_log (method, route, duration_ms, status_code, user_id) VALUES (?, ?, ?, ?, ?)',
                [$method, $route, $durationMs, $statusCode, $userId]
            );

            $driver = Db::get()->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                Db::execute("DELETE FROM slow_request_log WHERE created_at < datetime('now', '-30 days')");
            } else {
                Db::execute('DELETE FROM slow_request_log WHERE created_at < NOW() - INTERVAL 30 DAY');
            }
        } catch (\Throwable) {
            // Swallow silently
        }
    }

    public static function recent(?string $route = null, ?int $minDurationMs = null, int $limit = 20, ?string $since = null): array
    {
        [$whereSql, $params] = self::buildFilter($route, $minDurationMs, $since);
        $clampedLimit = max(1, min(100, $limit));

        return Db::fetchAll(
            "SELECT id, method, route, duration_ms, status_code, created_at
             FROM slow_request_log
             {$whereSql}
             ORDER BY id DESC
             LIMIT {$clampedLimit}",
            $params
        );
    }

    public static function count(?string $route = null, ?int $minDurationMs = null, ?string $since = null): int
    {
        [$whereSql, $params] = self::buildFilter($route, $minDurationMs, $since);
        $row = Db::fetchOne("SELECT COUNT(*) AS c FROM slow_request_log {$whereSql}", $params);
        return (int) ($row['c'] ?? 0);
    }

    private static function buildFilter(?string $route, ?int $minDurationMs, ?string $since): array
    {
        $clauses = [];
        $params = [];

        if ($route !== null && $route !== '') {
            $clauses[] = 'route LIKE ?';
            $params[] = '%' . $route . '%';
        }

        if ($minDurationMs !== null) {
            if ($minDurationMs < 0) {
                throw new \InvalidArgumentException("Invalid min_duration_ms '{$minDurationMs}'. Must be >= 0.");
            }
            $clauses[] = 'duration_ms >= ?';
            $params[] = $minDurationMs;
        }

        if ($since !== null && $since !== '') {
            $ts = strtotime($since);
            if ($ts === false) {
                throw new \InvalidArgumentException("Invalid since timestamp '{$since}'. Expected YYYY-MM-DD or datetime.");
            }
            $clauses[] = 'created_at >= ?';
            $params[] = date('Y-m-d H:i:s', $ts);
        }

        $whereSql = $clauses !== [] ? 'WHERE ' . implode(' AND ', $clauses) : '';
        return [$whereSql, $params];
    }
}
