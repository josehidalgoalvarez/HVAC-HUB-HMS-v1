<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\BuyListItem;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * BuyListController
 * Handles endpoints for manual items in the shared Buy List.
 */
class BuyListController
{
    /**
     * GET /api/buy-list/manual
     * List all manual buy list items, newest first.
     */
    public function listManual(Request $request, Response $response): Response
    {
        try {
            $items = BuyListItem::findAll();
            return Auth::jsonSuccess($items);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/buy-list/manual
     * Create a new manual buy list item.
     */
    public function createManual(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $item = BuyListItem::create($body);
            return Auth::jsonSuccess($item, 201);
        } catch (InvalidArgumentException $e) {
            return Auth::jsonError('validation_error', $e->getMessage(), 400);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/buy-list/manual/{id}
     * Delete a manual buy list item by ID.
     */
    public function deleteManual(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return Auth::jsonError('not_found', 'Buy list item not found', 404);
        }

        try {
            $deleted = BuyListItem::delete($id);
            if (!$deleted) {
                return Auth::jsonError('not_found', 'Buy list item not found', 404);
            }

            return Auth::jsonSuccess(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', $e->getMessage(), 500);
        }
    }
}
