<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\Notice;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * NoticeController
 * Handles Notice-of-Entry operations, 24-hour rule calculations,
 * state progression, and legal gate checks.
 */
class NoticeController
{
    /**
     * GET /api/notices
     * List all notices with gate status and ticket linkage.
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        try {
            $notices = Notice::findAll($params);
            return Auth::jsonSuccess($notices);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to fetch notices: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/notices
     * Create notice of entry. Automatically computes 24-hour serve-by deadline.
     */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        if (empty($body['entry_start'])) {
            return Auth::jsonError('validation_error', 'entry_start is required to compute the 24-hour legal serve-by deadline', 400);
        }

        try {
            $notice = Notice::create($body, $userId);
            return Auth::jsonSuccess($notice, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('create_failed', 'Failed to create notice: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/notices/{id}
     * Returns single notice with gate status.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing notice ID', 400);
        }

        try {
            $notice = Notice::findById($id);
            if ($notice === null) {
                return Auth::jsonError('not_found', "Notice #{$id} not found", 404);
            }
            return Auth::jsonSuccess($notice);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Error fetching notice: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/notices/{id}
     * Advances state (drafted -> sent -> served -> verified) or edits fields.
     * Writes append-only correction row on every change.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing notice ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $reason = isset($body['reason']) ? trim((string) $body['reason']) : null;
        unset($body['reason']);

        try {
            $updated = Notice::update($id, $body, $userId, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('update_failed', 'Failed to update notice: ' . $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/notices/{id}/gate-status
     * Returns legal gate status (green / amber / red) for run-sheet scheduling.
     */
    public function gateStatus(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing notice ID', 400);
        }

        try {
            $notice = Notice::findById($id);
            if ($notice === null) {
                return Auth::jsonError('not_found', "Notice #{$id} not found", 404);
            }

            $gate = Notice::calculateGateStatus($notice);
            return Auth::jsonSuccess([
                'notice_id' => (int) $id,
                'status' => $notice['status'],
                'entry_start' => $notice['entry_start'],
                'entry_end' => $notice['entry_end'],
                'serve_by_deadline' => $notice['serve_by_deadline'],
                'gate_status' => $gate['gate_status'],
                'is_cleared' => $gate['is_cleared'],
                'reason' => $gate['reason'],
            ]);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to evaluate gate status: ' . $e->getMessage(), 500);
        }
    }
}
