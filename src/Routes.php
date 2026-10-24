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
use App\Controllers\WeatherController;
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

        // Admin Seed Real Portfolio Endpoint
        $app->post('/api/admin/seed-demo', function (Request $request, Response $response): Response {
            require_once dirname(__DIR__) . '/cli/seed_portfolio.php';
            $body = (array) ($request->getParsedBody() ?? []);
            $photosDir = !empty($body['photos_dir']) ? (string) $body['photos_dir'] : null;
            $result = seedRealPortfolio($photosDir);
            return Auth::jsonSuccess($result);
        });

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

            // --- Ticket Timeline Endpoints (Append-Only) ---
            $group->get('/tickets/{id}/timeline', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $timeline = \App\Models\TicketTimeline::getForTicket($id);
                return Auth::jsonSuccess($timeline);
            });
            $group->post('/tickets/{id}/timeline', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $body = (array) ($request->getParsedBody() ?? []);
                $eventType = trim((string) ($body['event_type'] ?? 'note'));
                $actor = trim((string) ($body['actor'] ?? 'Jose (Tech)'));
                $note = isset($body['note']) ? (string) $body['note'] : null;
                $metadata = isset($body['metadata']) && is_array($body['metadata']) ? $body['metadata'] : null;
                $event = \App\Models\TicketTimeline::append($id, $eventType, $actor, $note, $metadata);
                return Auth::jsonSuccess($event, 201);
            });

            // --- Ticket Visits Logging & Outcomes ---
            $group->get('/tickets/{id}/visits', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $visits = \App\Models\TicketVisit::getForTicket($id);
                return Auth::jsonSuccess($visits);
            });
            $group->post('/tickets/{id}/visits', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $body = (array) ($request->getParsedBody() ?? []);
                $user = $request->getAttribute('user');
                $userId = isset($user['id']) ? (int) $user['id'] : null;
                try {
                    $visit = \App\Models\TicketVisit::logVisit($id, $body, $userId);
                    return Auth::jsonSuccess($visit, 201);
                } catch (\Throwable $e) {
                    return Auth::jsonError('visit_failed', $e->getMessage(), 400);
                }
            });

            // --- Ticket Parts Rework (Auto-Watch on Order) ---
            $group->get('/tickets/{id}/parts', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $parts = \App\Models\PartWorkflow::getPartsForTicket($id);
                return Auth::jsonSuccess($parts);
            });
            $group->post('/tickets/{id}/parts', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $body = (array) ($request->getParsedBody() ?? []);
                $user = $request->getAttribute('user');
                $userId = isset($user['id']) ? (int) $user['id'] : null;
                try {
                    $part = \App\Models\PartWorkflow::orderPart($id, $body, $userId);
                    return Auth::jsonSuccess($part, 201);
                } catch (\Throwable $e) {
                    return Auth::jsonError('part_order_failed', $e->getMessage(), 400);
                }
            });
            $group->post('/ticket-parts/{id}/arrive', function (Request $request, Response $response, array $args): Response {
                $id = (int) ($args['id'] ?? 0);
                $body = (array) ($request->getParsedBody() ?? []);
                $actor = trim((string) ($body['actor'] ?? 'Jose (Tech)'));
                try {
                    $part = \App\Models\PartWorkflow::markPartArrived($id, $actor);
                    return Auth::jsonSuccess($part);
                } catch (\Throwable $e) {
                    return Auth::jsonError('part_arrival_failed', $e->getMessage(), 400);
                }
            });

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
            $group->get('/parts/harvest-candidates', function (Request $request, Response $response): Response {
                $params = $request->getQueryParams();
                $query = isset($params['q']) ? (string) $params['q'] : null;
                $candidates = \App\Models\PartWorkflow::searchHarvestCandidates($query);
                return Auth::jsonSuccess($candidates);
            });
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

            // --- Rain-Only Weather Signal ---
            $group->get('/weather/rain-check', [WeatherController::class, 'rainCheck']);

            // --- Complexes Domain (Task 1) ---
            $group->get('/complexes', function (Request $request, Response $response): Response {
                try {
                    $rows = Db::fetchAll('SELECT c.*, (SELECT COUNT(*) FROM building b WHERE b.complex_id = c.id) as building_count FROM complexes c ORDER BY c.id ASC');
                } catch (\Throwable) {
                    $rows = Db::fetchAll('SELECT * FROM complexes ORDER BY id ASC');
                }
                $complexes = [];
                foreach ($rows as $c) {
                    $complexes[] = [
                        'id' => $c['slug'] ?? (string) $c['id'],
                        'slug' => $c['slug'] ?? '',
                        'db_id' => (int) $c['id'],
                        'name' => $c['name'],
                        'notes' => $c['notes'] ?? '',
                        'buildingCount' => (int) ($c['building_count'] ?? 0),
                        'building_count' => (int) ($c['building_count'] ?? 0),
                    ];
                }
                return Auth::jsonSuccess($complexes);
            });

            // --- Appliance Default Sets Domain (Task 3) ---
            $group->get('/default-sets', function (Request $request, Response $response): Response {
                $rows = Db::fetchAll('SELECT * FROM default_sets ORDER BY id ASC');
                $sets = [];
                foreach ($rows as $ds) {
                    $sets[] = [
                        'id' => $ds['id'],
                        'complexSlug' => $ds['complex_slug'],
                        'complex_slug' => $ds['complex_slug'],
                        'complexId' => $ds['complex_id'] ? (string) $ds['complex_id'] : null,
                        'complex_id' => $ds['complex_id'] ? (int) $ds['complex_id'] : null,
                        'name' => $ds['name'],
                        'unitType' => $ds['unit_type'],
                        'unit_type' => $ds['unit_type'],
                        'isDefault' => (bool) $ds['is_default'],
                        'is_default' => (int) $ds['is_default'],
                        'bedrooms' => $ds['bedrooms'] !== null ? (int) $ds['bedrooms'] : null,
                        'bathrooms' => $ds['bathrooms'] !== null ? (float) $ds['bathrooms'] : null,
                        'stories' => $ds['stories'] !== null ? (int) $ds['stories'] : null,
                        'hasUnitWaterHeater' => (bool) ($ds['has_unit_water_heater'] ?? false),
                        'has_unit_water_heater' => (int) ($ds['has_unit_water_heater'] ?? 0),
                        'appliances' => !empty($ds['appliances_json']) ? json_decode($ds['appliances_json'], true) : [],
                        'notes' => $ds['notes'] ?? '',
                    ];
                }
                return Auth::jsonSuccess($sets);
            });

            $group->patch('/default-sets/{id}', function (Request $request, Response $response, array $args): Response {
                $id = (string) ($args['id'] ?? '');
                $body = (array) ($request->getParsedBody() ?? []);
                $existing = Db::fetchOne('SELECT * FROM default_sets WHERE id = ?', [$id]);
                if (!$existing) {
                    return Auth::jsonError('not_found', 'Default set not found', 404);
                }
                $appliances = isset($body['appliances']) ? json_encode($body['appliances']) : $existing['appliances_json'];
                $notes = isset($body['notes']) ? (string) $body['notes'] : $existing['notes'];
                $bedrooms = array_key_exists('bedrooms', $body) ? ($body['bedrooms'] !== null ? (int) $body['bedrooms'] : null) : $existing['bedrooms'];
                $bathrooms = array_key_exists('washrooms', $body) ? ($body['washrooms'] !== null ? (float) $body['washrooms'] : null) : (array_key_exists('bathrooms', $body) ? ($body['bathrooms'] !== null ? (float) $body['bathrooms'] : null) : $existing['bathrooms']);
                $stories = array_key_exists('storeys', $body) ? ($body['storeys'] !== null ? (int) $body['storeys'] : null) : (array_key_exists('stories', $body) ? ($body['stories'] !== null ? (int) $body['stories'] : null) : $existing['stories']);

                Db::execute('UPDATE default_sets SET appliances_json = ?, notes = ?, bedrooms = ?, bathrooms = ?, stories = ? WHERE id = ?', [$appliances, $notes, $bedrooms, $bathrooms, $stories, $id]);
                return Auth::jsonSuccess(['status' => 'updated', 'id' => $id]);
            });

            // --- Unit Domain Endpoints ---
            $group->get('/units', function (Request $request, Response $response): Response {
                $rows = Db::fetchAll('SELECT u.*, (SELECT COUNT(*) FROM ticket_visit tv WHERE tv.unit_id = u.id AND tv.outcome = "failed_access") as failed_visits_count FROM unit u ORDER BY u.building_id ASC, u.unit_number ASC');
                $units = [];
                foreach ($rows as $u) {
                    $failedCount = (int) ($u['failed_visits_count'] ?? 0);
                    $units[] = [
                        'id' => (string) $u['id'],
                        'buildingId' => (string) $u['building_id'],
                        'unitNumber' => $u['unit_number'],
                        'floor' => $u['floor'],
                        'unitType' => $u['unit_type'] ?? 'apartment',
                        'defaultSetId' => $u['default_set_id'],
                        'bedrooms' => $u['bedrooms'] !== null ? (int) $u['bedrooms'] : null,
                        'washrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                        'bathrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                        'storeys' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                        'stories' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                        'washerDryerState' => $u['washer_dryer_state'] ?? null,
                        'washer_dryer_state' => $u['washer_dryer_state'] ?? null,
                        'renovated' => $u['renovated'] !== null ? (bool) $u['renovated'] : null,
                        'renovated_date' => $u['renovated_date'] ?? null,
                        'renovatedDate' => $u['renovated_date'] ?? null,
                        'move_in_date' => $u['move_in_date'] ?? null,
                        'moveInDate' => $u['move_in_date'] ?? null,
                        'occupancy_status' => $u['occupancy_status'] ?? 'unknown',
                        'occupancyStatus' => $u['occupancy_status'] ?? 'unknown',
                        'vacant_since' => $u['vacant_since'] ?? null,
                        'vacantSince' => $u['vacant_since'] ?? null,
                        'comments' => $u['comments'] ?? null,
                        'provenance' => $u['provenance'] ?? 'verified',
                        'failedVisitsCount' => $failedCount,
                        'failed_visits_count' => $failedCount,
                        'repeatAccessProblem' => ($failedCount >= 2),
                        'has_repeat_access_problem' => ($failedCount >= 2),
                    ];
                }
                return Auth::jsonSuccess($units);
            });

            $group->get('/units/{id}', function (Request $request, Response $response, array $args): Response {
                $id = (string) ($args['id'] ?? '');
                $u = Db::fetchOne('SELECT * FROM unit WHERE id = ?', [$id]);
                if (!$u && preg_match('/^unit-(\d+)-(.+)$/', $id, $matches)) {
                    $u = Db::fetchOne('SELECT * FROM unit WHERE building_id = ? AND unit_number = ?', [$matches[1], $matches[2]]);
                }
                if (!$u) {
                    return Auth::jsonError('not_found', 'Unit not found', 404);
                }
                $unitMetrics = \App\Models\TicketVisit::getMetricsForUnit((int) $u['id']);
                return Auth::jsonSuccess([
                    'id' => (string) $u['id'],
                    'buildingId' => (string) $u['building_id'],
                    'unitNumber' => $u['unit_number'],
                    'floor' => $u['floor'],
                    'unitType' => $u['unit_type'] ?? 'apartment',
                    'defaultSetId' => $u['default_set_id'],
                    'bedrooms' => $u['bedrooms'] !== null ? (int) $u['bedrooms'] : null,
                    'washrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                    'bathrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                    'storeys' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                    'stories' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                    'washerDryerState' => $u['washer_dryer_state'] ?? null,
                    'washer_dryer_state' => $u['washer_dryer_state'] ?? null,
                    'renovated' => $u['renovated'] !== null ? (bool) $u['renovated'] : null,
                    'renovated_date' => $u['renovated_date'] ?? null,
                    'renovatedDate' => $u['renovated_date'] ?? null,
                    'move_in_date' => $u['move_in_date'] ?? null,
                    'moveInDate' => $u['move_in_date'] ?? null,
                    'occupancy_status' => $u['occupancy_status'] ?? 'unknown',
                    'occupancyStatus' => $u['occupancy_status'] ?? 'unknown',
                    'vacant_since' => $u['vacant_since'] ?? null,
                    'vacantSince' => $u['vacant_since'] ?? null,
                    'comments' => $u['comments'] ?? null,
                    'provenance' => $u['provenance'] ?? 'verified',
                    'failedVisitsCount' => $unitMetrics['total_failed_visits'],
                    'failed_visits_count' => $unitMetrics['total_failed_visits'],
                    'last90DaysFailedVisits' => $unitMetrics['last_90_days_failed_visits'],
                    'repeatAccessProblem' => $unitMetrics['repeat_access_problem'],
                    'has_repeat_access_problem' => $unitMetrics['repeat_access_problem'],
                    'lastFailure' => $unitMetrics['last_failure'],
                    'visits' => $unitMetrics['visits'],
                ]);
            });

            $group->patch('/units/{id}', function (Request $request, Response $response, array $args): Response {
                $id = (string) ($args['id'] ?? '');
                $existing = Db::fetchOne('SELECT * FROM unit WHERE id = ?', [$id]);
                if (!$existing && preg_match('/^unit-(\d+)-(.+)$/', $id, $matches)) {
                    $existing = Db::fetchOne('SELECT * FROM unit WHERE building_id = ? AND unit_number = ?', [$matches[1], $matches[2]]);
                }
                if (!$existing) {
                    return Auth::jsonError('not_found', 'Unit not found', 404);
                }

                $body = (array) ($request->getParsedBody() ?? []);
                $fieldMap = [
                    'defaultSetId' => 'default_set_id',
                    'unitType' => 'unit_type',
                    'washerDryerState' => 'washer_dryer_state',
                    'renovatedDate' => 'renovated_date',
                    'moveInDate' => 'move_in_date',
                    'occupancyStatus' => 'occupancy_status',
                    'vacantSince' => 'vacant_since',
                ];
                foreach ($fieldMap as $camel => $snake) {
                    if (isset($body[$camel]) && !isset($body[$snake])) {
                        $body[$snake] = $body[$camel];
                    }
                }
                if (isset($body['bathrooms']) && !isset($body['washrooms'])) {
                    $body['washrooms'] = $body['bathrooms'];
                }
                if (isset($body['stories']) && !isset($body['storeys'])) {
                    $body['storeys'] = $body['stories'];
                }

                // Normalizations for unit context signals
                if (array_key_exists('renovated', $body)) {
                    if ($body['renovated'] === '' || $body['renovated'] === null) {
                        $body['renovated'] = null;
                    } else {
                        $body['renovated'] = ($body['renovated'] === true || $body['renovated'] === 1 || $body['renovated'] === '1' || $body['renovated'] === 'true') ? 1 : 0;
                    }
                }
                if (array_key_exists('renovated_date', $body) && ($body['renovated_date'] === '' || $body['renovated_date'] === null)) {
                    $body['renovated_date'] = null;
                }
                if (array_key_exists('move_in_date', $body) && ($body['move_in_date'] === '' || $body['move_in_date'] === null)) {
                    $body['move_in_date'] = null;
                }
                if (array_key_exists('vacant_since', $body) && ($body['vacant_since'] === '' || $body['vacant_since'] === null)) {
                    $body['vacant_since'] = null;
                }
                if (array_key_exists('occupancy_status', $body)) {
                    $body['occupancy_status'] = in_array($body['occupancy_status'], ['occupied', 'vacant', 'unknown'], true) ? $body['occupancy_status'] : 'unknown';
                }

                $allowedFields = [
                    'bedrooms', 'washrooms', 'storeys', 'washer_dryer_state', 'comments', 'default_set_id', 'unit_type', 'floor',
                    'renovated', 'renovated_date', 'move_in_date', 'occupancy_status', 'vacant_since'
                ];
                $updates = [];
                $params = [];
                $user = $request->getAttribute('user');
                $userId = is_array($user) && isset($user['id']) ? (int) $user['id'] : null;

                foreach ($allowedFields as $field) {
                    if (array_key_exists($field, $body)) {
                        $oldVal = $existing[$field] !== null ? (string) $existing[$field] : null;
                        $newVal = $body[$field] !== null ? (string) $body[$field] : null;
                        if ($oldVal !== $newVal) {
                            \App\Models\Correction::record('unit', (int) $existing['id'], $field, $oldVal, $newVal, $userId, 'Field update via PATCH /api/units');
                        }
                        $updates[] = "`$field` = ?";
                        $params[] = $body[$field];
                    }
                }

                if (!empty($updates)) {
                    $params[] = $existing['id'];
                    Db::execute('UPDATE unit SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
                }

                $u = Db::fetchOne('SELECT * FROM unit WHERE id = ?', [$existing['id']]);
                return Auth::jsonSuccess([
                    'id' => (string) $u['id'],
                    'buildingId' => (string) $u['building_id'],
                    'unitNumber' => $u['unit_number'],
                    'floor' => $u['floor'],
                    'unitType' => $u['unit_type'] ?? 'apartment',
                    'defaultSetId' => $u['default_set_id'],
                    'bedrooms' => $u['bedrooms'] !== null ? (int) $u['bedrooms'] : null,
                    'washrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                    'bathrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                    'storeys' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                    'stories' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                    'washerDryerState' => $u['washer_dryer_state'] ?? null,
                    'washer_dryer_state' => $u['washer_dryer_state'] ?? null,
                    'renovated' => $u['renovated'] !== null ? (bool) $u['renovated'] : null,
                    'renovated_date' => $u['renovated_date'] ?? null,
                    'renovatedDate' => $u['renovated_date'] ?? null,
                    'move_in_date' => $u['move_in_date'] ?? null,
                    'moveInDate' => $u['move_in_date'] ?? null,
                    'occupancy_status' => $u['occupancy_status'] ?? 'unknown',
                    'occupancyStatus' => $u['occupancy_status'] ?? 'unknown',
                    'vacant_since' => $u['vacant_since'] ?? null,
                    'vacantSince' => $u['vacant_since'] ?? null,
                    'comments' => $u['comments'] ?? null,
                    'provenance' => $u['provenance'] ?? 'verified',
                ]);
            });

            // --- Unit Visits & Repeat Access Endpoints ---
            $group->get('/units/{id}/visits', function (Request $request, Response $response, array $args): Response {
                $id = (string) ($args['id'] ?? '');
                $u = Db::fetchOne('SELECT id FROM unit WHERE id = ?', [$id]);
                if (!$u && preg_match('/^unit-(\d+)-(.+)$/', $id, $matches)) {
                    $u = Db::fetchOne('SELECT id FROM unit WHERE building_id = ? AND unit_number = ?', [$matches[1], $matches[2]]);
                }
                if (!$u) {
                    return Auth::jsonError('not_found', 'Unit not found', 404);
                }
                $unitId = (int) $u['id'];
                $metrics = \App\Models\TicketVisit::getMetricsForUnit($unitId);
                return Auth::jsonSuccess($metrics);
            });

            $group->get('/buildings/failed-visits', function (Request $request, Response $response): Response {
                $counts = \App\Models\TicketVisit::getBuildingFailedVisitCounts();
                return Auth::jsonSuccess($counts);
            });

            // --- Vacancy Parts Sourcing & Stock Transfers ---
            $group->post('/stock-transfers', function (Request $request, Response $response): Response {
                $body = (array) ($request->getParsedBody() ?? []);
                $user = $request->getAttribute('user');
                $userId = isset($user['id']) ? (int) $user['id'] : null;
                try {
                    $transfer = \App\Models\PartWorkflow::transferVacantAppliance($body, $userId);
                    return Auth::jsonSuccess($transfer, 201);
                } catch (\Throwable $e) {
                    return Auth::jsonError('stock_transfer_failed', $e->getMessage(), 400);
                }
            });

            // --- Inventory & Portfolio synchronization ---
            $group->get('/inventory', function (Request $request, Response $response): Response {
                try {
                    $complexRows = Db::fetchAll('SELECT c.*, (SELECT COUNT(*) FROM building b WHERE b.complex_id = c.id) as building_count FROM complexes c ORDER BY c.id ASC');
                } catch (\Throwable) {
                    $complexRows = Db::fetchAll('SELECT * FROM complexes ORDER BY id ASC');
                }
                $complexMap = [];
                $complexSlugMap = [];
                $complexes = [];
                foreach ($complexRows as $c) {
                    $complexMap[$c['id']] = $c['name'];
                    $complexSlugMap[$c['id']] = $c['slug'];
                    $complexes[] = [
                        'id' => $c['slug'] ?? (string) $c['id'],
                        'code' => strtoupper($c['slug'] ?? 'BD'),
                        'slug' => $c['slug'] ?? '',
                        'db_id' => (int) $c['id'],
                        'name' => $c['name'],
                        'description' => $c['notes'] ?? '',
                        'notes' => $c['notes'] ?? '',
                        'address' => '',
                        'buildingCount' => (int) ($c['building_count'] ?? 0),
                        'building_count' => (int) ($c['building_count'] ?? 0),
                    ];
                }

                $defaultSetRows = Db::fetchAll('SELECT * FROM default_sets ORDER BY id ASC');
                $defaultSets = [];
                foreach ($defaultSetRows as $ds) {
                    $defaultSets[] = [
                        'id' => $ds['id'],
                        'complexSlug' => $ds['complex_slug'],
                        'complex_slug' => $ds['complex_slug'],
                        'complexId' => $ds['complex_slug'] ?? ($ds['complex_id'] ? (string) $ds['complex_id'] : null),
                        'complex_id' => $ds['complex_id'] ? (int) $ds['complex_id'] : null,
                        'name' => $ds['name'],
                        'unitType' => $ds['unit_type'],
                        'unit_type' => $ds['unit_type'],
                        'isDefault' => (bool) $ds['is_default'],
                        'is_default' => (int) $ds['is_default'],
                        'bedrooms' => $ds['bedrooms'] !== null ? (int) $ds['bedrooms'] : null,
                        'bathrooms' => $ds['bathrooms'] !== null ? (float) $ds['bathrooms'] : null,
                        'stories' => $ds['stories'] !== null ? (int) $ds['stories'] : null,
                        'hasUnitWaterHeater' => (bool) ($ds['has_unit_water_heater'] ?? false),
                        'has_unit_water_heater' => (int) ($ds['has_unit_water_heater'] ?? 0),
                        'appliances' => !empty($ds['appliances_json']) ? json_decode($ds['appliances_json'], true) : [],
                        'notes' => $ds['notes'] ?? '',
                    ];
                }

                $buildingFailedCounts = \App\Models\TicketVisit::getBuildingFailedVisitCounts();
                $unitFailedCountsRows = Db::fetchAll('SELECT unit_id, COUNT(*) as failed_count FROM ticket_visit WHERE outcome = "failed_access" AND unit_id IS NOT NULL GROUP BY unit_id');
                $unitFailedMap = [];
                foreach ($unitFailedCountsRows as $uf) {
                    $unitFailedMap[(int) $uf['unit_id']] = (int) $uf['failed_count'];
                }

                $buildings = Db::fetchAll('SELECT * FROM building ORDER BY id ASC');
                $properties = [];
                $allUnits = [];
                foreach ($buildings as $b) {
                    $units = Db::fetchAll('SELECT * FROM unit WHERE building_id = ? ORDER BY unit_number ASC', [$b['id']]);
                    foreach ($units as $u) {
                        $failedCount = $unitFailedMap[(int) $u['id']] ?? 0;
                        $allUnits[] = [
                            'id' => (string) $u['id'],
                            'buildingId' => (string) $u['building_id'],
                            'unitNumber' => $u['unit_number'],
                            'floor' => $u['floor'],
                            'unitType' => $u['unit_type'] ?? 'apartment',
                            'defaultSetId' => $u['default_set_id'],
                            'bedrooms' => $u['bedrooms'] !== null ? (int) $u['bedrooms'] : null,
                            'washrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                            'bathrooms' => $u['washrooms'] !== null ? (int) $u['washrooms'] : null,
                            'storeys' => $u['storeys'] !== null ? (int) $u['storeys'] : null,
                            'stories' => $u['storeys'] !== null ? (int) $u['stories'] : null,
                            'washerDryerState' => $u['washer_dryer_state'] ?? null,
                            'washer_dryer_state' => $u['washer_dryer_state'] ?? null,
                            'renovated' => $u['renovated'] !== null ? (bool) $u['renovated'] : null,
                            'renovated_date' => $u['renovated_date'] ?? null,
                            'renovatedDate' => $u['renovated_date'] ?? null,
                            'move_in_date' => $u['move_in_date'] ?? null,
                            'moveInDate' => $u['move_in_date'] ?? null,
                            'occupancy_status' => $u['occupancy_status'] ?? 'unknown',
                            'occupancyStatus' => $u['occupancy_status'] ?? 'unknown',
                            'vacant_since' => $u['vacant_since'] ?? null,
                            'vacantSince' => $u['vacant_since'] ?? null,
                            'comments' => $u['comments'] ?? null,
                            'provenance' => $u['provenance'] ?? 'verified',
                            'failedVisitsCount' => $failedCount,
                            'failed_visits_count' => $failedCount,
                            'repeatAccessProblem' => ($failedCount >= 2),
                            'has_repeat_access_problem' => ($failedCount >= 2),
                        ];
                    }
                    $unitNumbers = array_column($units, 'unit_number');
                    $applianceCount = (int) (Db::fetchOne('SELECT COUNT(*) as c FROM appliance WHERE building_id = ?', [$b['id']])['c'] ?? 0);
                    $cId = $b['complex_id'] !== null ? (int) $b['complex_id'] : null;
                    $cName = $cId !== null ? ($complexMap[$cId] ?? null) : null;
                    $cSlug = $cId !== null ? ($complexSlugMap[$cId] ?? null) : null;
                    $bFailedCount = $buildingFailedCounts[(int) $b['id']] ?? 0;
                    $properties[] = [
                        'id' => (string) $b['id'],
                        'complex_id' => $cId,
                        'complex_name' => $cName,
                        'complexId' => $cSlug ?? ($cId !== null ? (string) $cId : null),
                        'complexSlug' => $cSlug,
                        'complexName' => $cName,
                        'clusterId' => $b['cluster_id'] ?? null,
                        'status' => $b['status'] ?? 'active',
                        'name' => $b['name'],
                        'address' => $b['address'],
                        'type' => $b['type'] ?? 'residential',
                        'units' => count($units),
                        'applianceCount' => $applianceCount,
                        'rooms' => !empty($unitNumbers) ? array_map(fn($u) => "Unit {$u}", $unitNumbers) : ['Basement', 'Mechanical Room'],
                        'imageUrl' => $b['image_url'] ?? '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
                        'comments' => $b['comments'] ?? '',
                        'role' => $b['role'] ?? 'standard',
                        'responsibility' => $b['responsibility'] ?? 'internal',
                        'failedVisitsCount' => $bFailedCount,
                        'failed_visits_count' => $bFailedCount,
                        'createdAt' => $b['created_at'],
                    ];
                }

                $applianceRows = Db::fetchAll('SELECT a.*, b.name as building_name, b.address as building_address, u.unit_number FROM appliance a LEFT JOIN building b ON a.building_id = b.id LEFT JOIN unit u ON a.unit_id = u.id ORDER BY a.id ASC');
                $appliances = [];
                foreach ($applianceRows as $a) {
                    $photos = Db::fetchAll('SELECT file_path FROM photo WHERE entity_type = "appliance" AND entity_id = ?', [$a['id']]);
                    $photoUrls = array_column($photos, 'file_path');
                    $imgUrl = !empty($a['image_url']) ? $a['image_url'] : (!empty($photoUrls) ? $photoUrls[0] : '');
                    $appliances[] = [
                        'id' => (string) $a['id'],
                        'propertyId' => (string) $a['building_id'],
                        'unitId' => $a['unit_id'] ? (string) $a['unit_id'] : null,
                        'name' => $a['name'],
                        'type' => $a['type'],
                        'brand' => $a['brand'],
                        'modelNumber' => $a['model_number'] ?? '',
                        'serialNumber' => $a['serial_number'] ?? '',
                        'location' => $a['location'] ?? '',
                        'room' => $a['room'] ?? '',
                        'status' => $a['status'] ?? 'operational',
                        'imageUrl' => $imgUrl,
                        'images' => !empty($imgUrl) ? [$imgUrl] : [],
                        'notes' => $a['notes'] ?? '',
                        'specs' => !empty($a['specs']) ? (json_decode($a['specs'], true) ?: new \stdClass()) : new \stdClass(),
                    ];
                }

                return Auth::jsonSuccess([
                    'complexes' => $complexes,
                    'defaultSets' => $defaultSets,
                    'properties' => $properties,
                    'appliances' => $appliances,
                    'units' => $allUnits,
                    'logs' => [],
                ]);
            });

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
