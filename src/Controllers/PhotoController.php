<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Config;
use App\Db;
use finfo;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use RuntimeException;
use Throwable;

/**
 * Controller for handling photo uploads with server-side validation and GD resizing backstop.
 */
class PhotoController
{
    private const MAX_DIMENSION = 1600;
    private const ALLOWED_MIMES = [
        'image/jpeg' => '.jpg',
        'image/pjpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
    ];

    public static function upload(Request $request, Response $response): Response
    {
        $uploadedFiles = $request->getUploadedFiles();
        /** @var UploadedFileInterface|null $uploadedFile */
        $uploadedFile = $uploadedFiles['photo'] ?? $uploadedFiles['file'] ?? null;

        if (!$uploadedFile instanceof UploadedFileInterface || $uploadedFile->getError() !== UPLOAD_ERR_OK) {
            return Auth::jsonError('invalid_upload', 'No valid image file uploaded', 400);
        }

        $maxBytes = (int) Config::get('upload.max_bytes', 5 * 1024 * 1024);
        if ($uploadedFile->getSize() > $maxBytes) {
            return Auth::jsonError('file_too_large', 'Image exceeds the 5MB size limit', 413);
        }

        // Get temporary file path or buffer for MIME detection
        $stream = $uploadedFile->getStream();
        $tempUri = $stream->getMetadata('uri');
        $needsCleanup = false;

        if (!$tempUri || !file_exists($tempUri)) {
            $tempUri = tempnam(sys_get_temp_dir(), 'hvachome_upload_');
            file_put_contents($tempUri, (string) $stream);
            $needsCleanup = true;
        }

        try {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tempUri);

            if (!array_key_exists($mime, self::ALLOWED_MIMES)) {
                return Auth::jsonError('invalid_mime', "Unsupported image format ({$mime}). Allowed: JPEG, PNG, WebP", 400);
            }

            // Ensure destination upload directory exists
            $uploadDir = (string) Config::get('upload.dir', dirname(__DIR__, 2) . '/public/uploads');
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filename = 'photo_' . bin2hex(random_bytes(10)) . '.jpg';
            $destinationPath = $uploadDir . '/' . $filename;

            // Server-side GD Resizing Backstop
            self::resizeAndSaveImage($tempUri, $destinationPath);

            $finalSize = filesize($destinationPath) ?: $uploadedFile->getSize();
            $publicUrl = '/uploads/' . $filename;

            // Read post parameters if attached
            $parsedBody = $request->getParsedBody();
            $params = is_array($parsedBody) ? $parsedBody : [];
            $entityType = (string) ($params['entity_type'] ?? 'general');
            $entityId = (int) ($params['entity_id'] ?? 0);
            $caption = isset($params['caption']) ? (string) $params['caption'] : null;

            $photoId = null;
            try {
                // If DB is reachable and user is present
                $user = $request->getAttribute('user');
                $userId = $user['id'] ?? null;

                Db::execute(
                    "INSERT INTO `photo` (`entity_type`, `entity_id`, `file_path`, `file_size_bytes`, `mime_type`, `caption`, `taken_by_user_id`)
                     VALUES (?, ?, ?, ?, 'image/jpeg', ?, ?)",
                    [$entityType, $entityId, $publicUrl, $finalSize, $caption, $userId]
                );
                $photoId = (int) Db::lastInsertId();
            } catch (Throwable) {
                // Non-fatal if DB is optional or offline during local dev
            }

            return Auth::jsonSuccess([
                'id' => $photoId,
                'url' => $publicUrl,
                'filePath' => $publicUrl,
                'fileSizeBytes' => $finalSize,
                'mimeType' => 'image/jpeg',
            ], 201);
        } finally {
            if ($needsCleanup && file_exists($tempUri)) {
                @unlink($tempUri);
            }
        }
    }

    /**
     * Resizes an image file to max 1600px dimension and saves as JPEG.
     */
    private static function resizeAndSaveImage(string $sourcePath, string $destinationPath): void
    {
        if (!function_exists('imagecreatefromstring')) {
            // GD not installed: fallback to direct copy
            copy($sourcePath, $destinationPath);
            return;
        }

        $raw = file_get_contents($sourcePath);
        if ($raw === false) {
            throw new RuntimeException("Could not read uploaded source image");
        }

        $image = @imagecreatefromstring($raw);
        if ($image === false) {
            // Fallback to direct move
            copy($sourcePath, $destinationPath);
            return;
        }

        $origWidth = imagesx($image);
        $origHeight = imagesy($image);

        if ($origWidth <= self::MAX_DIMENSION && $origHeight <= self::MAX_DIMENSION) {
            // Dimensions within 1600px: Save directly as JPEG with quality 85
            imagejpeg($image, $destinationPath, 85);
            imagedestroy($image);
            return;
        }

        // Calculate proportional dimensions
        if ($origWidth > $origHeight) {
            $newWidth = self::MAX_DIMENSION;
            $newHeight = (int) round(($origHeight / $origWidth) * self::MAX_DIMENSION);
        } else {
            $newHeight = self::MAX_DIMENSION;
            $newWidth = (int) round(($origWidth / $origHeight) * self::MAX_DIMENSION);
        }

        $resized = imagecreatetruecolor($newWidth, $newHeight);

        // Fill background with white (handling transparent PNG/WebP)
        $white = imagecolorallocate($resized, 255, 255, 255);
        imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $white);

        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

        imagejpeg($resized, $destinationPath, 85);

        imagedestroy($resized);
        imagedestroy($image);
    }
}
