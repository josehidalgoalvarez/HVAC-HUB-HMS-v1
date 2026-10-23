<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Config;
use App\Models\Ticket;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use RuntimeException;
use Throwable;

/**
 * IntakeController
 * Handles rapid ticket intake: screenshot photo + verbatim text + verified scope text.
 */
class IntakeController
{
    /**
     * POST /api/intake
     * Creates a ticket from screenshot intake in under 2 minutes.
     */
    public function intake(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $files = $request->getUploadedFiles();
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        $photoUrl = !empty($body['photo_url']) ? trim((string) $body['photo_url']) : null;

        // Process screenshot photo upload if attached
        $photoFile = $files['photo'] ?? ($files['screenshot'] ?? null);
        if ($photoFile instanceof UploadedFileInterface && $photoFile->getError() === UPLOAD_ERR_OK) {
            try {
                $photoUrl = $this->saveUploadedScreenshot($photoFile);
            } catch (Throwable $e) {
                return Auth::jsonError('upload_error', 'Failed to save screenshot photo: ' . $e->getMessage(), 400);
            }
        }

        $buildingId = !empty($body['building_id']) ? (int) $body['building_id'] : null;

        $verbatimText = !empty($body['verbatim_text']) ? trim((string) $body['verbatim_text']) : null;
        $verifiedScope = !empty($body['verified_scope']) ? trim((string) $body['verified_scope']) : null;
        $woNumber = !empty($body['wo_number']) ? trim((string) $body['wo_number']) : null;
        $unitId = !empty($body['unit_id']) ? (int) $body['unit_id'] : null;
        $priority = !empty($body['priority']) ? (string) $body['priority'] : 'medium';

        // Auto-resolve building from text/aliases if not explicitly provided or defaulted
        if ($buildingId === null || $buildingId === 1) {
            $textForResolution = implode(' ', array_filter([
                $verbatimText,
                $verifiedScope,
                $woNumber,
                $body['address'] ?? null,
                $body['building_name'] ?? null,
            ]));
            $resolvedId = $this->resolveBuildingFromText($textForResolution);
            if ($resolvedId !== null) {
                $buildingId = $resolvedId;
            } elseif ($buildingId === null) {
                $buildingId = 1;
            }
        }

        // Require at least one piece of context: verbatim text, verified scope, or photo
        if (empty($verbatimText) && empty($verifiedScope) && empty($photoUrl) && empty($body['title'])) {
            return Auth::jsonError('validation_error', 'At least verbatim text, verified scope, or a photo is required for intake', 400);
        }

        // Title generation
        $title = !empty($body['title']) ? trim((string) $body['title']) : null;
        if (!$title) {
            if ($verifiedScope) {
                $title = mb_strimwidth($verifiedScope, 0, 70, '...');
            } elseif ($verbatimText) {
                $title = mb_strimwidth($verbatimText, 0, 70, '...');
            } elseif ($woNumber) {
                $title = "Work Order {$woNumber}";
            } else {
                $title = 'Screenshot Intake Job';
            }
        }

        // State is 'verified' if verified scope text is populated, otherwise 'new'
        $initialStatus = !empty($verifiedScope) ? Ticket::STATE_VERIFIED : Ticket::STATE_NEW;

        $ticketData = [
            'wo_number' => $woNumber,
            'parent_ticket_id' => !empty($body['parent_ticket_id']) ? (int) $body['parent_ticket_id'] : null,
            'building_id' => $buildingId,
            'unit_id' => $unitId,
            'title' => $title,
            'description' => $body['description'] ?? $verbatimText,
            'verbatim_text' => $verbatimText,
            'verified_scope' => $verifiedScope,
            'photo_url' => $photoUrl,
            'status' => $initialStatus,
            'priority' => $priority,
            'assigned_tech_id' => !empty($body['assigned_tech_id']) ? (int) $body['assigned_tech_id'] : null,
        ];

        try {
            $created = Ticket::create($ticketData, $userId);
            return Auth::jsonSuccess($created, 201);
        } catch (Throwable $e) {
            return Auth::jsonError('intake_failed', 'Failed to save intaked ticket: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Save uploaded screenshot file, apply server-side resize if GD is available.
     */
    private function saveUploadedScreenshot(UploadedFileInterface $file): string
    {
        $uploadDir = (string) Config::get('upload.dir', dirname(__DIR__, 2) . '/public/uploads');
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
            throw new RuntimeException("Upload directory {$uploadDir} cannot be created.");
        }

        $filename = 'intake_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.jpg';
        $destPath = $uploadDir . '/' . $filename;

        $tempPath = $destPath . '.tmp';
        $file->moveTo($tempPath);

        // Server-side resize backstop (max 1600px width/height)
        if (extension_loaded('gd')) {
            $this->resizeImageGd($tempPath, $destPath, 1600, 1600, 75);
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        } else {
            rename($tempPath, $destPath);
        }

        return '/uploads/' . $filename;
    }

    private function resizeImageGd(string $src, string $dst, int $maxWidth, int $maxHeight, int $quality): void
    {
        $info = @getimagesize($src);
        if (!$info) {
            rename($src, $dst);
            return;
        }

        [$width, $height, $type] = $info;

        $img = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($src),
            IMAGETYPE_PNG => @imagecreatefrompng($src),
            IMAGETYPE_WEBP => @imagecreatefromwebp($src),
            default => null,
        };

        if (!$img) {
            rename($src, $dst);
            return;
        }

        $ratio = min($maxWidth / max(1, $width), $maxHeight / max(1, $height), 1.0);
        $newW = (int) round($width * $ratio);
        $newH = (int) round($height * $ratio);

        $resized = imagecreatetruecolor($newW, $newH);
        imagecopyresampled($resized, $img, 0, 0, 0, 0, $newW, $newH, $width, $height);
        imagejpeg($resized, $dst, $quality);

        imagedestroy($img);
        imagedestroy($resized);
    }

    private function resolveBuildingFromText(string $text): ?int
    {
        if (trim($text) === '') {
            return null;
        }

        $buildings = \App\Db::fetchAll('SELECT id, name, address, aliases FROM building');
        $cleanText = strtolower($text);

        // First pass: check aliases (exact alias match or simplified alias)
        foreach ($buildings as $b) {
            if (!empty($b['aliases'])) {
                $aliases = array_map('trim', explode(',', (string) $b['aliases']));
                foreach ($aliases as $alias) {
                    if ($alias === '') continue;
                    $cleanAlias = strtolower($alias);
                    if (str_contains($cleanText, $cleanAlias)) {
                        return (int) $b['id'];
                    }
                    $simplifiedAlias = preg_replace('/\b(st|street|rd|road|ave|avenue|dr|drive|lane)\b/i', '', $alias);
                    $simplifiedAlias = trim(preg_replace('/\s+/', ' ', (string) $simplifiedAlias));
                    if (strlen($simplifiedAlias) >= 4 && str_contains($cleanText, strtolower($simplifiedAlias))) {
                        return (int) $b['id'];
                    }
                }
            }
        }

        // Second pass: check building address or name
        foreach ($buildings as $b) {
            $name = strtolower($b['name'] ?? '');
            $address = strtolower($b['address'] ?? '');
            if ($name !== '' && str_contains($cleanText, $name)) {
                return (int) $b['id'];
            }
            if ($address !== '' && str_contains($cleanText, $address)) {
                return (int) $b['id'];
            }
        }

        return null;
    }
}

