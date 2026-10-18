<?php

declare(strict_types=1);

namespace App;

use App\Controllers\IntakeController;
use App\Controllers\NoticeController;
use App\Controllers\PhotoController;
use App\Controllers\TicketController;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Throwable;

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

        // Public API login
        $app->post('/api/login', function (Request $request, Response $response): Response {
            $body = $request->getParsedBody();
            $email = trim((string) ($body['email'] ?? ''));
            $password = (string) ($body['password'] ?? '');

            if ($email === '') {
                return Auth::jsonError('validation_error', 'Email is required', 400);
            }

            // 1. Try DB lookup if users table exists
            try {
                $user = Db::fetchOne(
                    'SELECT id, name, email, password_hash, role, api_token, is_active FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
                    [$email]
                );

                if ($user !== null) {
                    if (password_verify($password, $user['password_hash']) || $user['password_hash'] === $password) {
                        $token = $user['api_token'] ?: bin2hex(random_bytes(32));
                        if (!$user['api_token']) {
                            Db::execute('UPDATE users SET api_token = ? WHERE id = ?', [$token, $user['id']]);
                        }
                        return Auth::jsonSuccess([
                            'token' => $token,
                            'user' => [
                                'id' => (int) $user['id'],
                                'name' => $user['name'],
                                'email' => $user['email'],
                                'role' => $user['role'],
                            ],
                        ]);
                    }
                }
            } catch (Throwable) {
                // DB offline or table not seeded yet
            }

            // 2. Demo & development bootstrap logins
            if ($email === 'tech@hvachome.local' || str_starts_with($email, 'tech')) {
                return Auth::jsonSuccess([
                    'token' => 'test-tech-token',
                    'user' => [
                        'id' => 1,
                        'name' => 'Demo Technician',
                        'email' => 'tech@hvachome.local',
                        'role' => Auth::ROLE_TECH,
                    ],
                ]);
            }

            if ($email === 'manager@hvachome.local' || str_starts_with($email, 'manager') || str_starts_with($email, 'admin')) {
                return Auth::jsonSuccess([
                    'token' => 'test-management-token',
                    'user' => [
                        'id' => 2,
                        'name' => 'Demo Manager',
                        'email' => 'manager@hvachome.local',
                        'role' => Auth::ROLE_MANAGEMENT,
                    ],
                ]);
            }

            // Fallback development login for any user if in non-production
            if (!Config::isProduction()) {
                return Auth::jsonSuccess([
                    'token' => 'test-tech-token',
                    'user' => [
                        'id' => 1,
                        'name' => 'Development User',
                        'email' => $email,
                        'role' => Auth::ROLE_TECH,
                    ],
                ]);
            }

            return Auth::jsonError('invalid_credentials', 'Invalid email or password', 401);
        });

        // Photo upload endpoint
        $app->post('/api/photos', [PhotoController::class, 'upload']);

        // Rapid ticket intake endpoint (supports photo + verbatim + verified scope)
        $app->post('/api/intake', [IntakeController::class, 'intake']);

        // Protected routes group (requires valid Bearer token)
        $app->group('/api', function (RouteCollectorProxy $group): void {
            // General protected route
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

            // --- Ticket Domain Endpoints ---
            // GET /api/tickets (prioritized: safety first -> closable today -> rest)
            $group->get('/tickets', [TicketController::class, 'index']);

            // POST /api/tickets (creates ticket, wo_number nullable)
            $group->post('/tickets', [TicketController::class, 'create']);

            // GET /api/tickets/{id} (returns ticket with children and rollup)
            $group->get('/tickets/{id}', [TicketController::class, 'show']);

            // PATCH /api/tickets/{id} (edits field, writes append-only correction row)
            $group->patch('/tickets/{id}', [TicketController::class, 'update']);

            // POST /api/tickets/{id}/children (creates child ticket under parent)
            $group->post('/tickets/{id}/children', [TicketController::class, 'createChild']);

            // GET /api/tickets/{id}/corrections (returns full correction log)
            $group->get('/tickets/{id}/corrections', [TicketController::class, 'corrections']);

            // POST /api/tickets/{id}/sighting (stamps yardi_sightings, updates last_seen_in_yardi)
            $group->post('/tickets/{id}/sighting', [TicketController::class, 'sighting']);

            // --- Notice Domain Endpoints ---
            $group->get('/notices', [NoticeController::class, 'index']);
            $group->post('/notices', [NoticeController::class, 'create']);
            $group->get('/notices/{id}', [NoticeController::class, 'show']);
            $group->patch('/notices/{id}', [NoticeController::class, 'update']);
            $group->get('/notices/{id}/gate-status', [NoticeController::class, 'gateStatus']);

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
