<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\Equipment;
use App\Models\Stockpile;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * EquipmentController
 * Handles CRUD endpoints for physical tools and equipment.
 */
class EquipmentController
{
    /**
     * GET /api/stockpiles/{id}/equipment
     * List equipment assigned to a stockpile.
     */
    public function listByStockpile(Request $request, Response $response, array $args): Response
    {
        $stockpileId = (int) ($args['id'] ?? 0);
        if ($stockpileId <= 0) {
            return Auth::jsonError('not_found', 'Stockpile not found', 404);
        }

        // Verify stockpile exists
        $stockpile = Stockpile::findById($stockpileId);
        if (!$stockpile) {
            return Auth::jsonError('not_found', "Stockpile #{$stockpileId} not found", 404);
        }

        try {
            $items = Equipment::findByStockpile($stockpileId);
            return Auth::jsonSuccess($items);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/stockpiles/{id}/equipment
     * Create equipment assigned to a stockpile.
     */
    public function createForStockpile(Request $request, Response $response, array $args): Response
    {
        $stockpileId = (int) ($args['id'] ?? 0);
        if ($stockpileId <= 0) {
            return Auth::jsonError('not_found', 'Stockpile not found', 404);
        }

        // Verify stockpile exists (unknown stockpile_id -> 400 loud fail)
        $stockpile = Stockpile::findById($stockpileId);
        if (!$stockpile) {
            return Auth::jsonError('validation_error', "Stockpile #{$stockpileId} does not exist", 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        // Force/default stockpile_id to URL parameter
        $body['stockpile_id'] = $stockpileId;

        try {
            $item = Equipment::create($body);
            return Auth::jsonSuccess($item, 201);
        } catch (InvalidArgumentException $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/equipment/{id}
     * Update equipment status, notes, or other fields.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Equipment not found', 404);
        }

        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $updated = Equipment::update($id, $body);
            if (!$updated) {
                return Auth::jsonError('not_found', 'Equipment not found', 404);
            }

            return Auth::jsonSuccess($updated);
        } catch (InvalidArgumentException $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/equipment/{id}
     * Delete an equipment record by ID.
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Equipment not found', 404);
        }

        try {
            $deleted = Equipment::delete($id);
            if (!$deleted) {
                return Auth::jsonError('not_found', 'Equipment not found', 404);
            }

            return Auth::jsonSuccess(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }
}
