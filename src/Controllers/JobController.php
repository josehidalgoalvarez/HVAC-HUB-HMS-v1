<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Config;
use App\Db;
use App\Models\Job;
use finfo;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

/**
 * JobController
 * Handles field jobs, quick-logging, parts used, field notes, photo capture,
 * job close-out with ticket advancement, and offline outbox batch synchronization.
 */
class JobController
{
    private const ALLOWED_MIMES = [
        'image/jpeg' => '.jpg',
        'image/pjpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
    ];

    /**
     * GET /api/jobs
     * List field jobs.
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        try {
            $jobs = Job::findAll($params);
            return Auth::jsonSuccess($jobs);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Failed to fetch jobs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/jobs
     * Create a new field job session.
     */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $job = Job::create($body, $userId);
            return Auth::jsonSuccess($job, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('create_failed', 'Failed to create job: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/jobs/{id}
     * Get full job detail with parts, notes, photos, and linked ticket.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        try {
            $job = Job::findById($id);
            if ($job === null) {
                return Auth::jsonError('not_found', "Job #{$id} not found", 404);
            }
            return Auth::jsonSuccess($job);
        } catch (Throwable $e) {
            return Auth::jsonError('server_error', 'Error fetching job: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/jobs/{id}
     * Update job attributes.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $reason = isset($body['reason']) ? trim((string) $body['reason']) : null;
        unset($body['reason']);

        try {
            $updated = Job::update($id, $body, $userId, $reason);
            return Auth::jsonSuccess($updated);
        } catch (Throwable $e) {
            return Auth::jsonError('update_failed', 'Failed to update job: ' . $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/jobs/{id}/photos
     * Upload and attach photo to job (multipart form-data or JSON with file_path).
     */
    public function uploadPhoto(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        // Check if multipart file uploaded
        $uploadedFiles = $request->getUploadedFiles();
        /** @var UploadedFileInterface|null $uploadedFile */
        $uploadedFile = $uploadedFiles['photo'] ?? $uploadedFiles['file'] ?? null;

        $body = (array) ($request->getParsedBody() ?? []);
        $caption = isset($body['caption']) ? (string) $body['caption'] : 'Job progress photo';

        if ($uploadedFile instanceof UploadedFileInterface && $uploadedFile->getError() === UPLOAD_ERR_OK) {
            $maxBytes = (int) Config::get('upload.max_bytes', 5 * 1024 * 1024);
            if ($uploadedFile->getSize() > $maxBytes) {
                return Auth::jsonError('file_too_large', 'Image exceeds the 5MB size limit', 413);
            }

            $stream = $uploadedFile->getStream();
            $tempUri = $stream->getMetadata('uri');
            $needsCleanup = false;

            if (!$tempUri || !file_exists($tempUri)) {
                $tempUri = tempnam(sys_get_temp_dir(), 'hvachome_job_');
                file_put_contents($tempUri, (string) $stream);
                $needsCleanup = true;
            }

            try {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($tempUri);

                if (!array_key_exists($mime, self::ALLOWED_MIMES)) {
                    if ($needsCleanup && file_exists($tempUri)) {
                        unlink($tempUri);
                    }
                    return Auth::jsonError('invalid_mime', "Unsupported image format ({$mime})", 400);
                }

                $uploadDir = (string) Config::get('upload.dir', dirname(__DIR__, 2) . '/public/uploads');
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $filename = 'job_' . (int) $id . '_' . bin2hex(random_bytes(6)) . '.jpg';
                $destPath = $uploadDir . '/' . $filename;

                PhotoController::resizeAndSaveImage($tempUri, $destPath);

                if ($needsCleanup && file_exists($tempUri)) {
                    unlink($tempUri);
                }

                $fileSize = filesize($destPath) ?: $uploadedFile->getSize();
                $publicUrl = '/uploads/' . $filename;

                $photo = Job::addPhoto($id, $publicUrl, $fileSize, $caption, $userId);
                return Auth::jsonSuccess($photo, 201);
            } catch (Throwable $e) {
                if ($needsCleanup && file_exists($tempUri)) {
                    unlink($tempUri);
                }
                return Auth::jsonError('photo_upload_failed', 'Failed to process photo: ' . $e->getMessage(), 500);
            }
        }

        // Support direct JSON path (e.g. from pre-uploaded or offline queue photo)
        if (!empty($body['file_path'])) {
            try {
                $photo = Job::addPhoto(
                    $id,
                    (string) $body['file_path'],
                    (int) ($body['file_size_bytes'] ?? 0),
                    $caption,
                    $userId
                );
                return Auth::jsonSuccess($photo, 201);
            } catch (Throwable $e) {
                return Auth::jsonError('photo_add_failed', $e->getMessage(), 400);
            }
        }

        return Auth::jsonError('missing_file', 'No photo file or file_path provided', 400);
    }

    /**
     * POST /api/jobs/{id}/parts-used
     * Record a part used on the job.
     */
    public function addPartsUsed(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $partName = trim((string) ($body['part_name'] ?? ''));
        if ($partName === '') {
            return Auth::jsonError('bad_request', 'part_name is required', 400);
        }

        $quantity = isset($body['quantity']) ? (float) $body['quantity'] : 1.0;
        $unit = trim((string) ($body['unit'] ?? 'pcs'));
        $notes = isset($body['notes']) ? (string) $body['notes'] : null;

        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $part = Job::addPartUsed($id, $partName, $quantity, $unit, $notes, $userId);
            return Auth::jsonSuccess($part, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('part_add_failed', 'Failed to add part: ' . $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/jobs/{id}/notes
     * Add a technician note to the job.
     */
    public function addNotes(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $noteText = trim((string) ($body['note_text'] ?? ($body['text'] ?? ($body['note'] ?? ''))));
        if ($noteText === '') {
            return Auth::jsonError('bad_request', 'note_text cannot be empty', 400);
        }

        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $note = Job::addNote($id, $noteText, $userId);
            return Auth::jsonSuccess($note, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('note_add_failed', 'Failed to add note: ' . $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/jobs/{id}/close
     * Close out job with actual minutes, notes, parts, and advance ticket to done.
     */
    public function close(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'] ?? null;
        if (!$id) {
            return Auth::jsonError('bad_request', 'Missing job ID', 400);
        }

        $body = (array) ($request->getParsedBody() ?? []);
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        try {
            $closedJob = Job::close($id, $body, $userId);
            return Auth::jsonSuccess($closedJob);
        } catch (Throwable $e) {
            return Auth::jsonError('job_close_failed', 'Failed to close job: ' . $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/sync
     * Batch synchronization endpoint for offline outbox.
     * Replays queued mutations in sequential order.
     */
    public function batchSync(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $mutations = !empty($body['mutations']) && is_array($body['mutations']) ? $body['mutations'] : [];

        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        $results = [];
        $syncedCount = 0;
        $failures = [];

        foreach ($mutations as $idx => $m) {
            $actionType = $m['type'] ?? '';
            $idempotencyKey = $m['idempotency_key'] ?? ($m['id'] ?? (string) $idx);
            $payload = !empty($m['payload']) && is_array($m['payload']) ? $m['payload'] : [];
            $entityId = $m['job_id'] ?? ($payload['job_id'] ?? ($m['entity_id'] ?? null));

            try {
                $actionResult = null;

                switch ($actionType) {
                    case 'create_job':
                        $actionResult = Job::create($payload, $userId);
                        break;

                    case 'add_note':
                        $jobId = $entityId ?: ($payload['job_id'] ?? null);
                        $noteText = (string) ($payload['note_text'] ?? ($payload['note'] ?? ''));
                        $actionResult = Job::addNote($jobId, $noteText, $userId);
                        break;

                    case 'add_part_used':
                        $jobId = $entityId ?: ($payload['job_id'] ?? null);
                        $partName = (string) ($payload['part_name'] ?? '');
                        $qty = (float) ($payload['quantity'] ?? 1.0);
                        $unit = (string) ($payload['unit'] ?? 'pcs');
                        $notes = isset($payload['notes']) ? (string) $payload['notes'] : null;
                        $actionResult = Job::addPartUsed($jobId, $partName, $qty, $unit, $notes, $userId);
                        break;

                    case 'add_photo':
                        $jobId = $entityId ?: ($payload['job_id'] ?? null);
                        $filePath = (string) ($payload['file_path'] ?? '');
                        $size = (int) ($payload['file_size_bytes'] ?? 0);
                        $caption = $payload['caption'] ?? null;
                        $actionResult = Job::addPhoto($jobId, $filePath, $size, $caption, $userId);
                        break;

                    case 'close_job':
                        $jobId = $entityId ?: ($payload['job_id'] ?? null);
                        $actionResult = Job::close($jobId, $payload, $userId);
                        break;

                    case 'update_ticket':
                    case 'custom':
                    default:
                        $errMsg = "Mutation type '{$actionType}' is not supported for batch background sync. Discard or inspect details.";
                        $results[] = [
                            'idempotency_key' => $idempotencyKey,
                            'status' => 'unsupported',
                            'action' => $actionType,
                            'error' => $errMsg,
                        ];
                        $failures[] = [
                            'idempotency_key' => $idempotencyKey,
                            'action' => $actionType,
                            'status' => 'unsupported',
                            'error' => $errMsg,
                        ];
                        continue 2;
                }

                $results[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'synced',
                    'result' => $actionResult,
                ];
                $syncedCount++;
            } catch (Throwable $e) {
                $failures[] = [
                    'idempotency_key' => $idempotencyKey,
                    'action' => $actionType,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
                $results[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'failed',
                    'action' => $actionType,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return Auth::jsonSuccess([
            'synced_count' => $syncedCount,
            'total_submitted' => count($mutations),
            'results' => $results,
            'failures' => $failures,
        ]);
    }
}
