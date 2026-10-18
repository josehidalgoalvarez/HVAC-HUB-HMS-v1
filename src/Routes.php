<?php

declare(strict_types=1);

namespace App;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

/**
 * API Route Registration.
 */
class Routes
{
    public static function register(App $app): void
    {
        // Public API health check
        $app->get('/api/health', function (Request $request, Response $response): Response {
            return Auth::jsonSuccess(['status' => 'ok'], 200);
        });

        // Protected routes group (requires valid Bearer token)
        $app->group('/api', function (RouteCollectorProxy $group): void {
            // General protected route (any authenticated role)
            $group->get('/protected', function (Request $request, Response $response): Response {
                $user = $request->getAttribute('user');
                return Auth::jsonSuccess([
                    'message' => 'Access granted to protected resource',
                    'user' => [
                        'id' => $user['id'] ?? null,
                        'name' => $user['name'] ?? null,
                        'role' => $user['role'] ?? null,
                    ],
                ]);
            })->add(Auth::requireRole());

            // Tech role route
            $group->get('/tech/ping', function (Request $request, Response $response): Response {
                return Auth::jsonSuccess(['service' => 'tech', 'status' => 'ready']);
            })->add(Auth::requireRole(Auth::ROLE_TECH));

            // Management role route
            $group->get('/management/ping', function (Request $request, Response $response): Response {
                return Auth::jsonSuccess(['service' => 'management', 'status' => 'ready']);
            })->add(Auth::requireRole(Auth::ROLE_MANAGEMENT));
        });
    }
}
