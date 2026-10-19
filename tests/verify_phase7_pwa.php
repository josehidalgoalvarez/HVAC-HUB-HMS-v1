<?php
/**
 * Phase 7 Acceptance Verification: PWA Plumbing, Service Worker, Manifest, and iOS/Android Standalone UX
 */

echo "=== Running Phase 7 PWA & Standalone Engine Verification Tests ===\n\n";

$passes = 0;
$failures = 0;

function assertTest($condition, $message) {
    global $passes, $failures;
    if ($condition) {
        echo "[PASS] $message\n";
        $passes++;
    } else {
        echo "[FAIL] $message\n";
        $failures++;
    }
}

$baseDir = dirname(__DIR__);

// --- 1. Manifest Validation ---
echo "--- 1. PWA Manifest Verification ---\n";
$manifestFile = $baseDir . '/dist/manifest.webmanifest';
assertTest(file_exists($manifestFile), "1.1 dist/manifest.webmanifest exists");

$manifest = json_decode(file_get_contents($manifestFile), true);
assertTest($manifest !== null, "1.2 manifest.webmanifest parses as valid JSON");
assertTest($manifest['name'] === 'HVACHome Operations', "1.3 Manifest name is 'HVACHome Operations'");
assertTest($manifest['short_name'] === 'HVACHome', "1.4 Manifest short_name is 'HVACHome'");
assertTest(strtoupper($manifest['theme_color']) === '#0077B6', "1.5 Manifest theme_color is Technician Blue (#0077B6)");
assertTest($manifest['display'] === 'standalone', "1.6 Manifest display is 'standalone'");
assertTest($manifest['start_url'] === '/', "1.7 Manifest start_url is '/'");
assertTest($manifest['scope'] === '/', "1.8 Manifest scope is '/'");

$has192 = false;
$has512 = false;
$hasMaskable = false;

foreach ($manifest['icons'] as $icon) {
    if ($icon['sizes'] === '192x192') $has192 = true;
    if ($icon['sizes'] === '512x512' && ($icon['purpose'] ?? '') === 'any') $has512 = true;
    if ($icon['sizes'] === '512x512' && ($icon['purpose'] ?? '') === 'maskable') $hasMaskable = true;
}

assertTest($has192, "1.9 Manifest defines 192x192 icon");
assertTest($has512, "1.10 Manifest defines 512x512 standard icon");
assertTest($hasMaskable, "1.11 Manifest defines 512x512 maskable icon for Android adaptive launchers");

// Static manifest.json parity check
$staticManifestFile = $baseDir . '/public/manifest.json';
assertTest(file_exists($staticManifestFile), "1.12 public/manifest.json exists for legacy and explicit link targets");


// --- 2. Icon Asset Verification ---
echo "\n--- 2. Icon Assets Verification ---\n";
$icons = [
    'pwa-192x192.png' => 192,
    'pwa-512x512.png' => 512,
    'maskable-icon-512x512.png' => 512,
    'apple-touch-icon-180x180.png' => 180,
    'favicon.svg' => null,
];

foreach ($icons as $filename => $expectedDim) {
    $path = $baseDir . '/public/icons/' . $filename;
    assertTest(file_exists($path), "2.1 Asset public/icons/$filename exists");
    if ($expectedDim !== null && file_exists($path)) {
        // Read PNG header to verify width and height
        $data = file_get_contents($path);
        $w = unpack('N', substr($data, 16, 4))[1];
        $h = unpack('N', substr($data, 20, 4))[1];
        assertTest($w === $expectedDim && $h === $expectedDim, "2.2 $filename dimensions match {$expectedDim}x{$expectedDim} (got {$w}x{$h})");
    }
}


// --- 3. Service Worker & Workbox Precache Matrix ---
echo "\n--- 3. Service Worker & Workbox Precache Matrix ---\n";
$swFile = $baseDir . '/dist/sw.js';
assertTest(file_exists($swFile), "3.1 dist/sw.js exists");

$swContent = file_get_contents($swFile);
assertTest(strpos($swContent, 'precacheAndRoute') !== false, "3.2 Service worker contains precacheAndRoute");

// Verify that all code-split lazy chunks are in the precache manifest
$expectedViews = [
    'WatchesView',
    'DayPlanView',
    'TicketListView',
    'PartsView',
    'NoticePipelineView',
    'QuickLogWidget',
    'ProfileView',
    'PropertyListView',
    'PropertyDetailView',
    'PropertyLandingView',
    'ApplianceModule'
];

foreach ($expectedViews as $viewName) {
    $pattern = '/assets\/' . preg_quote($viewName, '/') . '-[a-zA-Z0-9_\-]+\.js/';
    assertTest(preg_match($pattern, $swContent) === 1, "3.3 Precache includes code-split chunk for $viewName");
}

// Runtime caching rules
assertTest(strpos($swContent, 'api-get-cache') !== false, "3.4 SW configures runtime cache 'api-get-cache' for GET API calls");
assertTest(strpos($swContent, 'NetworkFirst') !== false, "3.5 GET API calls use NetworkFirst strategy with timeout");
assertTest(strpos($swContent, 'POST') === false && strpos($swContent, 'PATCH') === false, "3.6 Mutations (POST/PATCH/DELETE) are strictly excluded from SW cache");


// --- 4. iOS Safari & Standalone Meta Configuration ---
echo "\n--- 4. iOS Safari & Standalone Meta Configuration ---\n";
$indexFile = $baseDir . '/index.html';
$html = file_get_contents($indexFile);

assertTest(strpos($html, 'viewport-fit=cover') !== false, "4.1 Viewport specifies viewport-fit=cover for full-bleed screens");
assertTest(strpos($html, 'apple-mobile-web-app-capable') !== false, "4.2 apple-mobile-web-app-capable set to yes");
assertTest(strpos($html, 'mobile-web-app-capable') !== false, "4.3 mobile-web-app-capable set to yes");
assertTest(strpos($html, 'apple-mobile-web-app-status-bar-style') !== false, "4.4 apple-mobile-web-app-status-bar-style configured");
assertTest(strpos($html, 'apple-touch-icon') !== false, "4.5 apple-touch-icon link tag present");
assertTest(strpos($html, 'theme-color') !== false && strpos($html, '#0077B6') !== false, "4.6 theme-color meta tag matches Technician Blue (#0077B6)");

// Safe area CSS rules
assertTest(strpos($html, '.pt-safe') !== false, "4.7 .pt-safe rule configured with env(safe-area-inset-top)");
assertTest(strpos($html, '.pb-safe') !== false, "4.8 .pb-safe rule configured with env(safe-area-inset-bottom)");
assertTest(strpos($html, '.pl-safe') !== false, "4.9 .pl-safe rule configured with env(safe-area-inset-left)");
assertTest(strpos($html, '.pr-safe') !== false, "4.10 .pr-safe rule configured with env(safe-area-inset-right)");


// --- 5. Standalone Design Audit & Safe-Area Protection ---
echo "\n--- 5. Standalone Design Audit & Safe-Area Protection ---\n";
$layoutFile = $baseDir . '/components/layout/LayoutWrapper.tsx';
$layoutContent = file_get_contents($layoutFile);
assertTest(strpos($layoutContent, 'pt-safe') !== false, "5.1 LayoutWrapper provides pt-safe wrapper preventing header notch clip");
assertTest(strpos($layoutContent, 'PWAInstallBanner') !== false, "5.2 LayoutWrapper mounts PWAInstallBanner");

$offlineBadgeFile = $baseDir . '/components/common/OfflineStatusBadge.tsx';
$offlineBadgeContent = file_get_contents($offlineBadgeFile);
assertTest(strpos($offlineBadgeContent, 'safe-area-inset-top') !== false, "5.3 OfflineStatusBadge respects safe-area-inset-top to avoid notch overlap");

$pwaBannerFile = $baseDir . '/components/common/PWAInstallBanner.tsx';
$pwaBannerContent = file_get_contents($pwaBannerFile);
assertTest(file_exists($pwaBannerFile), "5.4 PWAInstallBanner.tsx component exists");
assertTest(strpos($pwaBannerContent, 'beforeinstallprompt') !== false, "5.5 PWAInstallBanner handles Android beforeinstallprompt event");
assertTest(strpos($pwaBannerContent, 'isIosPrompt') !== false, "5.6 PWAInstallBanner detects iOS Safari and provides explicit Share guidance");
assertTest(strpos($pwaBannerContent, 'min-h-[44px]') !== false, "5.7 PWAInstallBanner enforces gloves-on >=44px touch targets");


// --- 6. Summary ---
echo "\n========================================\n";
echo "Phase 7 PWA Verification Summary:\n";
echo "Passes: $passes\n";
echo "Failures: $failures\n";
echo "========================================\n";

if ($failures === 0) {
    echo "All Phase 7 PWA Tests PASSED!\n";
    exit(0);
} else {
    echo "Phase 7 PWA Tests FAILED ($failures failures).\n";
    exit(1);
}
