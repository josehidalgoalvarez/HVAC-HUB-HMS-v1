<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;

Config::load();

echo "=== Testing Image Pipeline & GD Resizing Backstop ===\n";

// 1. Create a 4K test JPEG image (3840 x 2160)
$test4kPath = __DIR__ . '/test_4k_sample.jpg';
$img4k = imagecreatetruecolor(3840, 2160);
$bgColor = imagecolorallocate($img4k, 70, 130, 180);
imagefilledrectangle($img4k, 0, 0, 3840, 2160, $bgColor);
// Draw text or pattern
$textColor = imagecolorallocate($img4k, 255, 255, 255);
imagestring($img4k, 5, 100, 100, "HVACHome 4K Test Photo", $textColor);
imagejpeg($img4k, $test4kPath, 90);
imagedestroy($img4k);

$origSize = filesize($test4kPath);
echo "[+] Created 4K test photo: 3840x2160 ({$origSize} bytes)\n";

// 2. Start PHP server on 127.0.0.1:8897
$server = proc_open("php -S 127.0.0.1:8897 -t public", [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
], $pipes);

usleep(300000); // 300ms

try {
    // 3. Upload via multipart POST /api/photos
    $cfile = new CURLFile($test4kPath, 'image/jpeg', 'camera_photo_4k.jpg');
    $ch = curl_init("http://127.0.0.1:8897/api/photos");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'photo' => $cfile,
        'entity_type' => 'appliance',
        'entity_id' => '101',
        'caption' => '4K Rating Plate Test'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "[+] Upload response (HTTP {$httpCode}): {$response}\n";
    if ($httpCode !== 201) {
        throw new RuntimeException("Expected HTTP 201 Created, got {$httpCode}");
    }

    $resJson = json_decode($response, true);
    if (!isset($resJson['data']['url'])) {
        throw new RuntimeException("Response missing data.url");
    }

    $photoUrl = $resJson['data']['url'];
    echo "[+] Uploaded photo URL: {$photoUrl}\n";

    // 4. Verify photo is served back viewable via HTTP GET
    $ch = curl_init("http://127.0.0.1:8897" . $photoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $photoBody = curl_exec($ch);
    $viewHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($viewHttpCode !== 200) {
        throw new RuntimeException("Failed to fetch uploaded photo: HTTP {$viewHttpCode}");
    }
    echo "[PASS] Uploaded photo served back viewable: HTTP {$viewHttpCode}, Content-Type: {$contentType}\n";

    // 5. Verify GD server-side resizing backstop reduced dimensions to <= 1600
    $localSavedPath = dirname(__DIR__) . '/public' . $photoUrl;
    if (!file_exists($localSavedPath)) {
        throw new RuntimeException("Saved file not found at: {$localSavedPath}");
    }

    $info = getimagesize($localSavedPath);
    if ($info === false) {
        throw new RuntimeException("getimagesize failed on saved photo");
    }

    [$savedWidth, $savedHeight] = $info;
    echo "[+] Server-side saved photo dimensions: {$savedWidth}x{$savedHeight}\n";

    if ($savedWidth > 1600 || $savedHeight > 1600) {
        throw new RuntimeException("Server-side backstop failed: dimensions {$savedWidth}x{$savedHeight} exceed 1600px cap");
    }
    echo "[PASS] Server-side GD backstop successfully resized 4K image (max dim: " . max($savedWidth, $savedHeight) . " <= 1600px)\n";

    echo "\nALL IMAGE PIPELINE CHECKS PASSED!\n";
} finally {
    proc_terminate($server);
    if (file_exists($test4kPath)) {
        @unlink($test4kPath);
    }
}
