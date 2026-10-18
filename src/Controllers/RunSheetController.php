<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\RunSheet;
use App\Models\RunSheetBlock;
use App\Services\BatchSuggester;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * RunSheetController
 * Handles day-plans, travel time blocks, batch scheduling by site proximity,
 * notice legal gate integration, and e-bike carry capacity checks.
 */
class RunSheetController
{
    /**
     * GET /api/run-sheets
     * List run sheets with block counts and rollups.
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        try {
            $sheets = RunSheet::findAll($params);
            return Auth::jsonSuccess($sheets);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to fetch run sheets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/run-sheets
     * Create a new run sheet, optionally accepting an array of blocks.
     */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $sheet = RunSheet::create($body, $userId);
            return Auth::jsonSuccess($sheet, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('create_failed', 'Failed to create run sheet: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/run-sheets/{id}
     * Returns full run sheet detail with all ordered blocks, notice gate statuses, and carry checks.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing run sheet ID', 400);
        }

        try {
            $sheet = RunSheet::findById($id);
            if ($sheet === null) {
                return Auth::jsonError('not_found', "Run sheet #{$id} not found", 404);
            }
            return Auth::jsonSuccess($sheet);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Error fetching run sheet: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/run-sheets/{id}/blocks
     * Add a time block to a run sheet (ticket + site + estimated minutes).
     */
    public function addBlock(Request $request, Response $response, array $args): Response
    {
        $runSheetId = $args['id'] ?? null;
        if (!$runSheetId) {
            return Auth::jsonError('bad_request', 'Missing run sheet ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $block = RunSheetBlock::create($runSheetId, $body, $userId);
            return Auth::jsonSuccess($block, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('block_create_failed', 'Failed to add block: ' . $e->getMessage(), 400);
        }
    }

    /**
     * PATCH /api/run-sheets/{id}/blocks/{blockId}
     * Update block (status, actual_minutes, time, notes).
     */
    public function updateBlock(Request $request, Response $response, array $args): Response
    {
        $blockId = $args['blockId'] ?? null;
        if (!$blockId) {
            return Auth::jsonError('bad_request', 'Missing block ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $reason = isset($body['reason']) ? trim((string) $body['reason']) : null;
        unset($body['reason']);

        try {
            $updated = RunSheetBlock::update($blockId, $body, $userId, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('block_update_failed', 'Failed to update block: ' . $e->getMessage(), 400);
        }
    }

    /**
     * DELETE /api/run-sheets/{id}/blocks/{blockId}
     * Remove block from run sheet.
     */
    public function deleteBlock(Request $request, Response $response, array $args): Response
    {
        $blockId = $args['blockId'] ?? null;
        if (!$blockId) {
            return Auth::jsonError('bad_request', 'Missing block ID', 400);
        }

        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $deleted = RunSheetBlock::delete($blockId, $userId);
            if (!$deleted) {
                return Auth::jsonError('not_found', "Block #{$blockId} not found", 404);
            }
            return Auth::jsonSuccess(['deleted' => true, 'id' => (int) $blockId]);
        } catch (Throwable) {
            return Auth::jsonError('server_error', 'Failed to delete block', 500);
        }
    }

    /**
     * POST /api/run-sheets/suggest-batch
     * Groups open tickets by site proximity, returning travel-ordered blocks.
     */
    public function suggestBatch(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $ticketIds = !empty($body['ticket_ids']) && is_array($body['ticket_ids']) ? $body['ticket_ids'] : [];
        $startTime = !empty($body['start_time']) ? (string) $body['start_time'] : '09:00';

        try {
            $suggestion = BatchSuggester::suggest($ticketIds, $startTime);
            return Auth::jsonSuccess($suggestion);
        } catch (Throwable $e) {
            return Auth::jsonError('batch_suggest_failed', 'Failed to generate batch suggestion: ' . $e->getMessage(), 500);
        }
    }
}
