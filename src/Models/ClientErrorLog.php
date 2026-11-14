<?php
declare(strict_types=1);

namespace App\Models;

use App\Db;
use PDO;

class ClientErrorLog
{
    public const VALID_SOURCES = ['boundary', 'window', 'unhandledrejection'];

    /**
     * Redact Bearer tokens, Authorization headers, and password= substrings.
     */
    public static function redact(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }
        $text = preg_replace('/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i', 'Bearer [REDACTED]', $text) ?? $text;
        $text = preg_replace('/Authorization\s*:\s*[^\r\n]+/i', 'Authorization: [REDACTED]', $text) ?? $text;
        $text = preg_replace('/(password\s*[=:]\s*)[^\s&"\']+/i', '$1[REDACTED]', $text) ?? $text;
        return $text;
    }

    /**
     * Best-effort insert of one client error row + 30-day retention cleanup.
     * Returns inserted row ID, or 0 on failure. Never throws.
     */
    public static function log(array $row): int
    {
        try {
            $source = in_array($row['source'] ?? '', self::VALID_SOURCES, true) ? $row['source'] : 'window';
            $message = substr((string) self::redact((string) ($row['message'] ?? '')), 0, 2000);
            $stack = isset($row['stack']) ? substr((string) self::redact((string) $row['stack']), 0, 4000) : null;
            $componentStack = isset($row['component_stack']) ? substr((string) self::redact((string) $row['component_stack']), 0, 4000) : null;
            $route = isset($row['route']) ? substr((string) $row['route'], 0, 255) : null;
            $appVersion = isset($row['app_version']) ? substr((string) $row['app_version'], 0, 64) : null;
            $userAgent = isset($row['user_agent']) ? substr((string) $row['user_agent'], 0, 255) : null;
            $userId = isset($row['user_id']) ? (int) $row['user_id'] : null;

            Db::execute(
                'INSERT INTO client_error_log (source, message, stack, component_stack, route, app_version, user_agent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$source, $message, $stack, $componentStack, $route, $appVersion, $userAgent, $userId]
            );
            $id = (int) Db::get()->lastInsertId();

            $driver = Db::get()->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                Db::execute("DELETE FROM client_error_log WHERE created_at < datetime('now', '-30 days')");
            } else {
                Db::execute('DELETE FROM client_error_log WHERE created_at < NOW() - INTERVAL 30 DAY');
            }

            return $id;
        } catch (\Throwable) {
            return 0;
        }
    }

    public static function recent(?string $source = null, int $limit = 20, ?string $since = null): array
    {
        [$whereSql, $params] = self::buildFilter($source, $since);
        $clampedLimit = max(1, min(100, $limit));

        return Db::fetchAll(
            "SELECT id, source, message, stack, component_stack, route, app_version, created_at
             FROM client_error_log
             {$whereSql}
             ORDER BY id DESC
             LIMIT {$clampedLimit}",
            $params
        );
    }

    public static function count(?string $source = null, ?string $since = null): int
    {
        [$whereSql, $params] = self::buildFilter($source, $since);
        $row = Db::fetchOne("SELECT COUNT(*) AS c FROM client_error_log {$whereSql}", $params);
        return (int) ($row['c'] ?? 0);
    }

    private static function buildFilter(?string $source, ?string $since): array
    {
        $clauses = [];
        $params = [];

        if ($source !== null && $source !== '') {
            if (!in_array($source, self::VALID_SOURCES, true)) {
                throw new \InvalidArgumentException("Invalid source '{$source}'. Must be one of: boundary, window, unhandledrejection.");
            }
            $clauses[] = 'source = ?';
            $params[] = $source;
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
