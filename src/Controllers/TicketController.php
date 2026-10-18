<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\Correction;
use App\Models\Ticket;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * TicketController
 * Handles work order operations, parent/child linking, state transitions,
 * audit corrections, and Yardi sightings.
 */
class TicketController
{
    /**
     * GET /api/tickets
     * Prioritized list: safety first -> closable today -> rest
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        try {
            $tickets = Ticket::findAll($params);
            return Auth::jsonSuccess($tickets);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to fetch tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/tickets
     * Creates a new ticket. wo_number is NULLABLE.
     */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        if (empty($body['title']) && empty($body['verbatim_text']) && empty($body['verified_scope'])) {
            return Auth::jsonError('validation_error', 'Title or scope description is required', 400);
        }

        // Auto-generate title if missing but scope or verbatim provided
        if (empty($body['title'])) {
            $text = !empty($body['verified_scope']) ? (string) $body['verified_scope'] : (string) ($body['verbatim_text'] ?? 'New Work Order');
            $body['title'] = mb_strimwidth($text, 0, 80, '...');
        }

        try {
            $ticket = Ticket::create($body, $userId);
            return Auth::jsonSuccess($ticket, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('create_failed', 'Failed to create ticket: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/tickets/{id}
     * Returns ticket detail including children list and parent rollup summary.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing ticket ID', 400);
        }

        try {
            $ticket = Ticket::findWithChildren($id);
            if ($ticket === null) {
                return Auth::jsonError('not_found', "Ticket #{$id} not found", 404);
            }
            return Auth::jsonSuccess($ticket);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Error fetching ticket: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/tickets/{id}
     * Edits any field; writes an append-only correction row for every change.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing ticket ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $reason = isset($body['reason']) ? trim((string) $body['reason']) : null;
        unset($body['reason']);

        try {
            $updated = Ticket::update($id, $body, $userId, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('update_failed', 'Failed to update ticket: ' . $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/tickets/{id}/children
     * Creates a child ticket linked to this parent (1 parent -> N children pattern).
     */
    public function createChild(Request $request, Response $response, array $args): Response
    {
        $parentId = $args['id'] ?? null;
        if (!$parentId) {
            return Auth::jsonError('bad_request', 'Missing parent ticket ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        if (empty($body['title'])) {
            $body['title'] = 'Child Work Order';
        }

        try {
            $child = Ticket::createChild($parentId, $body, $userId);
            return Auth::jsonSuccess($child, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('child_creation_failed', 'Failed to create child ticket: ' . $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/tickets/{id}/corrections
     * Returns full append-only audit trail for this ticket.
     */
    public function corrections(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing ticket ID', 400);
        }

        try {
            $log = Correction::getForEntity('ticket', $id);
            return Auth::jsonSuccess($log);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to load corrections: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/tickets/{id}/sighting
     * Stamps Yardi sightings mirror and updates last_seen_in_yardi.
     * READ-ONLY: never auto-deletes, never writes back to Yardi.
     */
    public function sighting(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing ticket ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $result = Ticket::recordSighting($id, $body);
            return Auth::jsonSuccess($result);
        } catch (Throwable $e) {
            return Auth::jsonError('sighting_failed', 'Failed to record Yardi sighting: ' . $e->getMessage(), 400);
        }
    }
}
