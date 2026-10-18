<?php

declare(strict_types=1);

/**
 * Hostinger Cron Entrypoint for Watch Engine
 * Evaluates proactive watches, checks notice deadlines and freezing weather,
 * batches quiet hours, and updates triggered statuses.
 *
 * Example Cron Schedule (every 15 or 30 minutes):
 *   star/15 * * * * /usr/bin/php /home/u123456/public_html/cli/check-watches.php >> /home/u123456/logs/watches.log 2>&1
 */

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Services\WatchEngine;

try {
    // Ensure DB connection is established
    Db::get();

    $summary = WatchEngine::evaluateAll();

    $timestamp = date('Y-m-d H:i:s');
    echo "[{$timestamp}] Watch evaluation complete: {$summary['message']}\n";
    if (!empty($summary['triggered_watches'])) {
        foreach ($summary['triggered_watches'] as $tw) {
            $batchNotice = !empty($tw['quiet_hours_delayed']) ? ' [QUEUED FOR MORNING DIGEST]' : '';
            echo "  - TRIGGERED #{$tw['id']} ({$tw['watch_type']}): {$tw['latest_trigger_reason']}{$batchNotice}\n";
        }
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "[ERROR] Watch evaluation failed: " . $e->getMessage() . "\n");
    exit(1);
}
