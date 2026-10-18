<?php

declare(strict_types=1);

namespace App;

/**
 * Environment-based configuration for HVACHome Slim 4 API.
 */
class Config
{
    private static ?array $settings = null;

    public static function load(): void
    {
        if (self::$settings !== null) {
            return;
        }

        // Load .env file from root if present
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);
                    // Remove surrounding quotes
                    if (preg_match('/^"(.*)"$/', $value, $m) || preg_match('/^\'(.*)\'$/', $value, $m)) {
                        $value = $m[1];
                    }
                    if (!isset($_ENV[$key]) && !isset($_SERVER[$key])) {
                        putenv("{$key}={$value}");
                        $_ENV[$key] = $value;
                    }
                }
            }
        }

        $corsAllowed = self::env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173');
        $corsOrigins = array_values(array_filter(array_map('trim', explode(',', $corsAllowed))));

        self::$settings = [
            'app_env' => self::env('APP_ENV', 'development'),
            'app_secret' => self::env('APP_SECRET', 'hvachome-v2-dev-secret-token'),
            'db' => [
                'host' => self::env('DB_HOST', '127.0.0.1'),
                'port' => (int) self::env('DB_PORT', '3306'),
                'database' => self::env('DB_DATABASE', 'hvachome'),
                'username' => self::env('DB_USERNAME', 'root'),
                'password' => self::env('DB_PASSWORD', ''),
                'charset' => self::env('DB_CHARSET', 'utf8mb4'),
            ],
            'cors' => [
                'allowed_origins' => $corsOrigins,
                'allowed_headers' => ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
                'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            ],
            'upload' => [
                'dir' => self::env('UPLOAD_DIR', dirname(__DIR__) . '/public/uploads'),
                'max_bytes' => 5 * 1024 * 1024, // 5MB cap
            ],
        ];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::load();
        $parts = explode('.', $key);
        $curr = self::$settings;
        foreach ($parts as $part) {
            if (!is_array($curr) || !array_key_exists($part, $curr)) {
                return $default;
            }
            $curr = $curr[$part];
        }
        return $curr;
    }

    public static function isProduction(): bool
    {
        return self::get('app_env') === 'production';
    }

    private static function env(string $key, string $default = ''): string
    {
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }
        return $default;
    }
}
