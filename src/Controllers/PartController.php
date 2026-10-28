<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\Part;
use App\Models\Stockpile;
use App\Models\Supplier;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * PartController
 * Handles catalog search, stockpile lookups, part usage recording,
 * harvest-first shopping lists, and supplier contact directory.
 */
class PartController
{
    /**
     * GET /api/parts
     * Search by model / part number / keyword.
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $filters = [];

        if (!empty($params['q'])) {
            $filters['q'] = trim((string) $params['q']);
        }

        if (isset($params['is_reorder'])) {
            $filters['is_reorder'] = filter_var($params['is_reorder'], FILTER_VALIDATE_BOOLEAN);
        }

        if (!empty($params['since'])) {
            $filters['since'] = trim((string) $params['since']);
        }

        try {
            $parts = Part::findAll($filters);
            return $this->respondWithEtag($request, $parts);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/parts
     * Create new catalog part in stash.
     * Writable by both technician and management roles.
     */
    public function create(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];
        $user = $request->getAttribute('user');

        // Both technician and management roles are authorized to create parts / write to stash
        if ($user && !in_array($user['role'] ?? '', [Auth::ROLE_TECH, Auth::ROLE_MANAGEMENT], true)) {
            return Auth::jsonError('forbidden', "Access denied for role '{$user['role']}'. Technician or management role required.", 403);
        }

        try {
            if ($user && !empty($user['id'])) {
                $body['user_id'] = (int) $user['id'];
            }
            $part = Part::create($body);
            return Auth::jsonSuccess($part, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/parts/{id}
     * Retrieve single part record with stock breakdown and price history.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $part = Part::findById($id);

        if ($part === null) {
            return Auth::jsonError('not_found', "Part #{$id} not found", 404);
        }

        return Auth::jsonSuccess($part);
    }

    /**
     * PATCH /api/parts/{id}
     * Modify part fields with append-only correction audit.
     * Writable by technician and management roles.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $body = $request->getParsedBody() ?? [];

        $user = $request->getAttribute('user');
        if ($user && !in_array($user['role'] ?? '', [Auth::ROLE_TECH, Auth::ROLE_MANAGEMENT], true)) {
            return Auth::jsonError('forbidden', "Access denied for role '{$user['role']}'. Technician or management role required.", 403);
        }

        $userId = $user['id'] ?? null;
        $reason = $body['reason'] ?? null;

        try {
            $updated = Part::update($id, $body, $userId ? (int) $userId : null, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('update_failed', $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/parts/{id}/use
     * Log part usage on a job:
     * - Decrements stock
     * - Logs usage in job_part
     * - Writes append-only correction row
     * - Flags 'reorder' when dropping to/below reorder point
     * Writable by technician and management roles.
     */
    public function usePart(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $body = $request->getParsedBody() ?? [];

        $user = $request->getAttribute('user');
        if ($user && !in_array($user['role'] ?? '', [Auth::ROLE_TECH, Auth::ROLE_MANAGEMENT], true)) {
            return Auth::jsonError('forbidden', "Access denied for role '{$user['role']}'. Technician or management role required.", 403);
        }

        $quantity = isset($body['quantity']) ? (int) $body['quantity'] : 1;
        $jobId = !empty($body['job_id']) ? (int) $body['job_id'] : null;
        $stockpileId = !empty($body['stockpile_id']) ? (int) $body['stockpile_id'] : null;
        $reason = $body['reason'] ?? null;
        $userId = $user['id'] ?? null;

        try {
            $result = Part::usePart(
                $id,
                $quantity,
                $jobId,
                $stockpileId,
                $userId ? (int) $userId : null,
                $reason
            );

            return Auth::jsonSuccess($result);
        } catch (Throwable $e) {
            return Auth::jsonError('part_use_failed', $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/stockpiles
     * List all storage stockpiles.
     */
    public function stockpiles(Request $request, Response $response): Response
    {
        try {
            $stockpiles = Stockpile::findAll();
            return $this->respondWithEtag($request, $stockpiles);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/stockpiles
     * Create a stockpile.
     */
    public function createStockpile(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        try {
            $stockpile = Stockpile::create($body);
            return Auth::jsonSuccess($stockpile, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/stockpiles/{id}/parts
     * List all parts allocated to a specific stockpile.
     */
    public function stockpileParts(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Stockpile not found', 404);
        }

        try {
            $stockpile = Stockpile::findById($id);
            if ($stockpile === null) {
                return Auth::jsonError('not_found', 'Stockpile not found', 404);
            }

            $parts = Stockpile::getParts($id);
            return $this->respondWithEtag($request, $parts);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/stockpiles/{id}/appliances
     * List all stored appliances at a specific stockpile.
     */
    public function stockpileAppliances(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Stockpile not found', 404);
        }

        try {
            $stockpile = Stockpile::findById($id);
            if ($stockpile === null) {
                return Auth::jsonError('not_found', 'Stockpile not found', 404);
            }

            $appliances = Stockpile::getAppliances($id);
            return $this->respondWithEtag($request, $appliances);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/appliances/{id}/move
     * Record an appliance movement and update status/location.
     */
    public function moveAppliance(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Appliance not found', 404);
        }

        $user = Auth::getCurrentUser();
        $userId = $user['id'] ?? null;

        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $result = Stockpile::moveAppliance($id, $body, $userId);
            return Auth::jsonSuccess($result);
        } catch (Throwable $e) {
            return Auth::jsonError('bad_request', $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/appliances/{id}/movements
     * List movement history for an appliance.
     */
    public function applianceMovements(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Appliance not found', 404);
        }

        try {
            $movements = Stockpile::getApplianceMovements($id);
            return $this->respondWithEtag($request, $movements);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/suppliers
     * List all suppliers with phone and hours.
     */
    public function suppliers(Request $request, Response $response): Response
    {
        try {
            $suppliers = Supplier::findAll();
            return $this->respondWithEtag($request, $suppliers);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * Helper to compute ETag and handle conditional 304 response.
     */
    private function respondWithEtag(Request $request, mixed $data): Response
    {
        $payload = json_encode([
            'data' => $data,
            'error' => null,
        ], JSON_UNESCAPED_SLASHES);
        $etag = '"' . md5((string) $payload) . '"';
        $ifNoneMatch = $request->getHeaderLine('If-None-Match');
        if ($ifNoneMatch !== '' && ($ifNoneMatch === $etag || trim($ifNoneMatch, '"') === trim($etag, '"'))) {
            $res = new \Slim\Psr7\Response(304);
            return $res->withHeader('ETag', $etag);
        }
        $response = new \Slim\Psr7\Response(200);
        $response->getBody()->write((string) $payload);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('ETag', $etag)
            ->withHeader('Cache-Control', 'no-cache');
    }

    /**
     * POST /api/suppliers
     * Create a supplier record.
     */
    public function createSupplier(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        try {
            $supplier = Supplier::create($body);
            return Auth::jsonSuccess($supplier, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/shopping-lists/from-tickets
     * Builds harvest-first shopping list from open tickets:
     * - Collects needed parts across ticket IDs
     * - Dedupes by part
     * - Flags items available in stockpile as "harvest first @ <stockpile>"
     * - Flags unfulfilled quantities as "buy @ <supplier>"
     */
    public function shoppingList(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];
        $ticketIds = $body['ticket_ids'] ?? [];

        if (!is_array($ticketIds) || empty($ticketIds)) {
            return Auth::jsonError('validation_error', 'ticket_ids array is required', 400);
        }

        try {
            $list = Part::buildShoppingListFromTickets($ticketIds);
            return Auth::jsonSuccess($list);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }
}
