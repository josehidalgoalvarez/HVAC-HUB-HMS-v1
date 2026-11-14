<?php
declare(strict_types=1);

namespace App\Models;

use App\Db;
use PDO;

class ServerErrorLog
{
    public const VALID_LEVELS = ['error', 'warning', 'fatal'];

    /**
     * Best-effort insert of one server error row + 30-day retention cleanup.
     * Never throws; logging failures must never break the request.
     */
    public static function log(array $row): void
    {
        try {
            $level = in_array($row['level'] ?? '', self::VALID_LEVELS, true) ? $row['level'] : 'error';
            $message = (string) ($row['message'] ?? '');
            $file = isset($row['file']) ? substr((string) $row['file'], 0, 255) : null;
            $line = isset($row['line']) ? (int) $row['line'] : null;
            $route = isset($row['route']) ? substr((string) $row['route'], 0, 255) : null;
            $userId = isset($row['user_id']) ? (int) $row['user_id'] : null;

            // Redaction: context is method + path only (never headers, tokens, passwords, or bodies).
            $contextJson = null;
            if (isset($row['context']) && is_array($row['context'])) {
                $safeContext = [];
                if (isset($row['context']['method'])) {
                    $safeContext['method'] = substr((string) $row['context']['method'], 0, 16);
                }
                if (isset($row['context']['path'])) {
                    $safeContext['path'] = substr((string) $row['context']['path'], 0, 255);
                }
                if ($safeContext !== []) {
                    $contextJson = json_encode($safeContext, JSON_UNESCAPED_SLASHES);
                }
            }

            Db::execute(
                'INSERT INTO server_error_log (level, message, file, line, route, user_id, context) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$level, $message, $file, $line, $route, $userId, $contextJson]
            );

            $driver = Db::get()->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                Db::execute("DELETE FROM server_error_log WHERE created_at < datetime('now', '-30 days')");
            } else {
                Db::execute('DELETE FROM server_error_log WHERE created_at < NOW() - INTERVAL 30 DAY');
            }
        } catch (\Throwable) {
            // Swallow silently
        }
    }

    public static function recent(?string $level = null, int $limit = 20, ?string $since = null): array
    {
        [$whereSql, $params] = self::buildFilter($level, $since);
        $clampedLimit = max(1, min(100, $limit));

        return Db::fetchAll(
            "SELECT id, level, message, file, line, route, created_at
             FROM server_error_log
             {$whereSql}
             ORDER BY id DESC
             LIMIT {$clampedLimit}",
            $params
        );
    }

    public static function count(?string $level = null, ?string $since = null): int
    {
        [$whereSql, $params] = self::buildFilter($level, $since);
        $row = Db::fetchOne("SELECT COUNT(*) AS c FROM server_error_log {$whereSql}", $params);
        return (int) ($row['c'] ?? 0);
    }

    private static function buildFilter(?string $level, ?string $since): array
    {
        $clauses = [];
        $params = [];

        if ($level !== null && $level !== '') {
            if (!in_array($level, self::VALID_LEVELS, true)) {
                throw new \InvalidArgumentException("Invalid level '{$level}'. Must be one of: error, warning, fatal.");
            }
            $clauses[] = 'level = ?';
            $params[] = $level;
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
