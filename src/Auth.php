<?php

declare(strict_types=1);

namespace App;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;
use Throwable;

/**
 * Authentication and authorization service for HVACHome API.
 * Supports Bearer token lookup, role verification (tech, management).
 */
class Auth
{
    public const ROLE_TECH = 'tech';
    public const ROLE_MANAGEMENT = 'management';

    /**
     * Extract bearer token from Authorization header.
     */
    public static function extractBearerToken(Request $request): ?string
    {
        $header = $request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Authenticate token against the database or development fallback.
     */
    public static function authenticate(string $token): ?array
    {
        if (trim($token) === '') {
            return null;
        }

        // 1. Check database users table if reachable
        try {
            $user = Db::fetchOne(
                'SELECT id, name, email, role, is_active FROM users WHERE api_token = ? AND is_active = 1 LIMIT 1',
                [$token]
            );
            if ($user !== null) {
                return $user;
            }
        } catch (Throwable) {
            // If DB is offline during unit testing or initial skeleton, allow bootstrap dev tokens
        }

        // 2. Built-in bootstrap tokens for local dev and automated tests
        if (!Config::isProduction() && ($token === 'test-tech-token' || $token === 'bearerhvachomeantigravitymuseideprototypev2mainteinance')) {
            try {
                $user = Db::fetchOne('SELECT id, name, email, role, is_active FROM users WHERE id = 1');
                if (!$user) {
                    Db::execute(
                        "INSERT INTO users (id, name, email, password_hash, role, is_active, api_token) "
                        . "VALUES (1, 'Demo Technician', 'tech@hvachome.local', 'bootstrap', 'tech', 1, 'bearerhvachomeantigravitymuseideprototypev2mainteinance')"
                    );
                } else {
                    Db::execute(
                        "UPDATE users SET api_token = 'bearerhvachomeantigravitymuseideprototypev2mainteinance' WHERE id = 1"
                    );
                }
            } catch (Throwable) {}

            return [
                'id' => 1,
                'name' => 'Demo Technician',
                'email' => 'tech@hvachome.local',
                'role' => self::ROLE_TECH,
                'is_active' => 1,
            ];
        }

        if (!Config::isProduction() && ($token === 'test-management-token' || $token === 'dev-management-token')) {
            try {
                $user = Db::fetchOne('SELECT id, name, email, role, is_active FROM users WHERE id = 2');
                if (!$user) {
                    Db::execute(
                        "INSERT INTO users (id, name, email, password_hash, role, is_active, api_token) "
                        . "VALUES (2, 'Demo Manager', 'manager@hvachome.local', 'bootstrap', 'management', 1, 'dev-management-token')"
                    );
                }
            } catch (Throwable) {}

            return [
                'id' => 2,
                'name' => 'Demo Manager',
                'email' => 'manager@hvachome.local',
                'role' => self::ROLE_MANAGEMENT,
                'is_active' => 1,
            ];
        }

        return null;
    }

    /**
     * Factory for PSR-15 role-checking middleware.
     */
    public static function requireRole(?string $requiredRole = null): MiddlewareInterface
    {
        return new class($requiredRole) implements MiddlewareInterface {
            public function __construct(private readonly ?string $requiredRole) {}

            public function process(Request $request, RequestHandler $handler): Response
            {
                $token = Auth::extractBearerToken($request);

                if ($token === null) {
                    return Auth::jsonError('unauthorized', 'Missing Authorization Bearer token', 401);
                }

                $user = Auth::authenticate($token);
                if ($user === null) {
                    return Auth::jsonError('unauthorized', 'Invalid or expired authentication token', 401);
                }

                if ($this->requiredRole !== null) {
                    // Management can access tech routes, but tech cannot access management-only routes
                    $hasPermission = ($user['role'] === $this->requiredRole)
                        || ($user['role'] === Auth::ROLE_MANAGEMENT && $this->requiredRole === Auth::ROLE_TECH);

                    if (!$hasPermission) {
                        return Auth::jsonError('forbidden', "Access denied for role '{$user['role']}'. Required: '{$this->requiredRole}'", 403);
                    }
                }

                return $handler->handle($request->withAttribute('user', $user));
            }
        };
    }

    /**
     * Helper to return standard JSON error response.
     */
    public static function jsonError(string $code, string $message, int $status = 400): Response
    {
        $response = new SlimResponse($status);
        $payload = json_encode([
            'data' => null,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ], JSON_UNESCAPED_SLASHES);

        $response->getBody()->write((string) $payload);
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * Helper to return standard JSON success response.
     */
    public static function jsonSuccess(mixed $data = null, int $status = 200): Response
    {
        $response = new SlimResponse($status);
        $payload = json_encode([
            'data' => $data,
            'error' => null,
        ], JSON_UNESCAPED_SLASHES);

        $response->getBody()->write((string) $payload);
        return $response->withHeader('Content-Type', 'application/json');
    }
}
