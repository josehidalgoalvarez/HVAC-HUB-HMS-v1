<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Models\Watch;
use App\Services\WatchEngine;
use DateTimeImmutable;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * WatchController
 * Manages proactive risk watches, evaluations, digest generation, and snooze/acknowledge actions.
 */
class WatchController
{
    /**
     * GET /api/watches
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();

        // Check if client requested digest view directly via query param
        if (($params['view'] ?? '') === 'digest') {
            return $this->digest($request, $response);
        }

        $filters = [];
        if (!empty($params['state'])) {
            $filters['state'] = (string) $params['state'];
        }
        if (!empty($params['watch_type'])) {
            $filters['watch_type'] = (string) $params['watch_type'];
        }
        if (!empty($params['target_type'])) {
            $filters['target_type'] = (string) $params['target_type'];
        }
        if (!empty($params['target_id'])) {
            $filters['target_id'] = (int) $params['target_id'];
        }

        $watches = Watch::findAll($filters);
        return Auth::jsonSuccess($watches);
    }

    /**
     * GET /api/watches/{id}
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $watch = Watch::findById($id);

        if ($watch === null) {
            return Auth::jsonError('not_found', "Watch #{$id} not found", 404);
        }

        return Auth::jsonSuccess($watch);
    }

    /**
     * POST /api/watches
     */
    public function create(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];
        $user = $request->getAttribute('user');

        if (empty($body['watch_type'])) {
            return Auth::jsonError('invalid_data', 'watch_type is required', 400);
        }

        if (!empty($user['id']) && empty($body['user_id'])) {
            $body['user_id'] = (int) $user['id'];
        }

        try {
            $created = Watch::create($body);
            return Auth::jsonSuccess($created, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('create_failed', $e->getMessage(), 400);
        }
    }

    /**
     * PATCH /api/watches/{id}
     * Supports snooze, acknowledge, resolve, reactivate, or field changes.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $body = $request->getParsedBody() ?? [];
        $user = $request->getAttribute('user');
        $userId = $user['id'] ?? null;

        $action = $body['action'] ?? null;

        try {
            if ($action === 'snooze') {
                $duration = (string) ($body['duration'] ?? '1h');
                $refTime = null;
                if (!empty($body['simulated_time'])) {
                    $refTime = new DateTimeImmutable((string) $body['simulated_time']);
                }
                $updated = Watch::snooze($id, $duration, $userId ? (int) $userId : null, $refTime);
                return Auth::jsonSuccess($updated);
            }

            if ($action === 'acknowledge') {
                $updated = Watch::acknowledge($id, $userId ? (int) $userId : null);
                return Auth::jsonSuccess($updated);
            }

            if ($action === 'resolve') {
                $updated = Watch::resolve($id, $userId ? (int) $userId : null);
                return Auth::jsonSuccess($updated);
            }

            if ($action === 'reactivate') {
                $updated = Watch::reactivate($id, $userId ? (int) $userId : null);
                return Auth::jsonSuccess($updated);
            }

            // General field update
            $reason = $body['reason'] ?? null;
            $updated = Watch::update($id, $body, $userId ? (int) $userId : null, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('update_failed', $e->getMessage(), 400);
        }
    }

    /**
     * DELETE /api/watches/{id}
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        $deleted = Watch::delete($id);

        if (!$deleted) {
            return Auth::jsonError('not_found', "Watch #{$id} not found", 404);
        }

        return Auth::jsonSuccess(['deleted' => true, 'id' => $id]);
    }

    /**
     * POST /api/watches/evaluate
     * Runs all active watches and flips triggered ones (called by cron or on-demand).
     */
    public function evaluate(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        $simulatedTime = null;
        if (!empty($body['simulated_time'])) {
            try {
                $simulatedTime = new DateTimeImmutable((string) $body['simulated_time']);
            } catch (Throwable) {
                return Auth::jsonError('invalid_time', 'Invalid simulated_time format', 400);
            }
        }

        $options = [];
        if (isset($body['quiet_start'])) {
            $options['quiet_start'] = (int) $body['quiet_start'];
        }
        if (isset($body['quiet_end'])) {
            $options['quiet_end'] = (int) $body['quiet_end'];
        }

        try {
            $result = WatchEngine::evaluateAll($simulatedTime, $options);
            return Auth::jsonSuccess($result);
        } catch (Throwable $e) {
            return Auth::jsonError('evaluation_failed', $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/watches/digest
     * Returns today's active digest with triggered alerts and morning batch items.
     */
    public function digest(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();

        $currentTime = null;
        if (!empty($params['simulated_time'])) {
            try {
                $currentTime = new DateTimeImmutable((string) $params['simulated_time']);
            } catch (Throwable) {}
        }

        $options = [];
        if (isset($params['quiet_start'])) {
            $options['quiet_start'] = (int) $params['quiet_start'];
        }
        if (isset($params['quiet_end'])) {
            $options['quiet_end'] = (int) $params['quiet_end'];
        }

        $digest = Watch::getDigest($currentTime, $options);
        return Auth::jsonSuccess($digest);
    }
}
