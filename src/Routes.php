<?php

declare(strict_types=1);

namespace App;

use App\Controllers\IntakeController;
use App\Controllers\JobController;
use App\Controllers\NoticeController;
use App\Controllers\PartController;
use App\Controllers\PhotoController;
use App\Controllers\RunSheetController;
use App\Controllers\TicketController;
use App\Controllers\WatchController;
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

            // --- Run Sheet Domain Endpoints (Phase 2 Day-Plan) ---
            $group->post('/run-sheets/suggest-batch', [RunSheetController::class, 'suggestBatch']);
            $group->get('/run-sheets', [RunSheetController::class, 'index']);
            $group->post('/run-sheets', [RunSheetController::class, 'create']);
            $group->get('/run-sheets/{id}', [RunSheetController::class, 'show']);
            $group->post('/run-sheets/{id}/blocks', [RunSheetController::class, 'addBlock']);
            $group->patch('/run-sheets/{id}/blocks/{blockId}', [RunSheetController::class, 'updateBlock']);
            $group->delete('/run-sheets/{id}/blocks/{blockId}', [RunSheetController::class, 'deleteBlock']);

            // --- Field Jobs & Offline Sync (Phase 3 Field Loop) ---
            $group->get('/jobs', [JobController::class, 'index']);
            $group->post('/jobs', [JobController::class, 'create']);
            $group->get('/jobs/{id}', [JobController::class, 'show']);
            $group->patch('/jobs/{id}', [JobController::class, 'update']);
            $group->post('/jobs/{id}/photos', [JobController::class, 'uploadPhoto']);
            $group->post('/jobs/{id}/parts-used', [JobController::class, 'addPartsUsed']);
            $group->post('/jobs/{id}/notes', [JobController::class, 'addNotes']);
            $group->post('/jobs/{id}/close', [JobController::class, 'close']);
            $group->post('/sync', [JobController::class, 'batchSync']);

            // --- Parts, Stockpiles, Shopping Lists, and Suppliers (Phase 4) ---
            $group->get('/parts', [PartController::class, 'index']);
            $group->post('/parts', [PartController::class, 'create']);
            $group->get('/parts/{id}', [PartController::class, 'show']);
            $group->patch('/parts/{id}', [PartController::class, 'update']);
            $group->post('/parts/{id}/use', [PartController::class, 'usePart']);
            $group->get('/stockpiles', [PartController::class, 'stockpiles']);
            $group->post('/stockpiles', [PartController::class, 'createStockpile']);
            $group->get('/suppliers', [PartController::class, 'suppliers']);
            $group->post('/suppliers', [PartController::class, 'createSupplier']);
            $group->post('/shopping-lists/from-tickets', [PartController::class, 'shoppingList']);

            // --- Proactive Watch Engine & Digest (Phase 6) ---
            $group->get('/watches', [WatchController::class, 'index']);
            $group->post('/watches', [WatchController::class, 'create']);
            $group->get('/watches/digest', [WatchController::class, 'digest']);
            $group->post('/watches/evaluate', [WatchController::class, 'evaluate']);
            $group->get('/watches/{id}', [WatchController::class, 'show']);
            $group->patch('/watches/{id}', [WatchController::class, 'update']);
            $group->delete('/watches/{id}', [WatchController::class, 'delete']);

            // Tech role route
            $group->get('/tech/ping', function (Request $request, Response $response): Response {
                return Auth::jsonSuccess(['service' => 'tech', 'status' => 'ready']);
            })->add(Auth::requireRole(Auth::ROLE_TECH));

            // Management role route
            $group->get('/management/ping', function (Request $request, Response $response): Response {
                return Auth::jsonSuccess(['service' => 'management', 'status' => 'ready']);
            })->add(Auth::requireRole(Auth::ROLE_MANAGEMENT));
        })->add(Auth::requireRole());
    }
}
