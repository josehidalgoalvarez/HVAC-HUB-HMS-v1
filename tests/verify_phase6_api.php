<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\Watch;
use App\Services\WatchEngine;
use App\Services\WeatherService;

$passes = [];
$failures = [];

function assertTest(bool $condition, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[] = $description;
        echo "[PASS] {$description}\n";
    } else {
        $failures[] = $description;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running Phase 6 Proactive Watch Engine Backend Tests ===\n\n";

// 0. Initialize clean SQLite test database
$testDbPath = __DIR__ . '/phase6_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// 1. Seed base user, building, unit, and tickets
echo "--- 1. Seed Base Domain Data ---\n";
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Tech Joe', 'joe@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, '1719 Bath Road', '1719 Bath Rd')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '104')");
Db::execute("INSERT INTO ticket (id, building_id, unit_id, title, status) VALUES (1, 1, 1, 'Radiator valve leaking', 'in-progress')");

assertTest(true, "1.1 Base schema initialized and seeded", $passes, $failures);

// 2. Acceptance Criterion 1: Notice Deadline Watch
echo "\n--- 2. Acceptance Criterion 1: Notice Deadline Watch (`notice_deadline`) ---\n";
// Create Notice 1: unverified, entry window Friday 11:00, serve-by was Thursday 11:00
$noticeUnverified = Notice::create([
    'ticket_id' => 1,
    'unit_number' => '104',
    'tenant_name' => 'Alice Tenant',
    'entry_start' => '2026-10-23 11:00:00',
    'entry_end' => '2026-10-23 13:00:00',
    'reason' => 'Annual heating loop inspection',
]);
assertTest($noticeUnverified['id'] > 0, "2.1 Notice #{$noticeUnverified['id']} created", $passes, $failures);
assertTest($noticeUnverified['status'] === 'drafted', "2.2 Notice status is unverified (drafted)", $passes, $failures);

// Create Watch for Notice 1
$watchNotice = Watch::create([
    'watch_type' => 'notice_deadline',
    'target_type' => 'notice',
    'target_id' => $noticeUnverified['id'],
    'title' => "Notice #{$noticeUnverified['id']} Deadline Watch",
]);
assertTest($watchNotice['id'] > 0, "2.3 Watch #{$watchNotice['id']} created", $passes, $failures);
assertTest($watchNotice['state'] === 'active', "2.4 Watch starts in 'active' state", $passes, $failures);

// Simulate time BEFORE deadline (Thursday 09:00:00 vs deadline Thursday 11:00:00)
$simTimeBefore = new DateTimeImmutable('2026-10-22 09:00:00');
$evalBefore = WatchEngine::evaluateAll($simTimeBefore);
$freshWatchBefore = Watch::findById($watchNotice['id']);
assertTest($freshWatchBefore['state'] === 'active', "2.5 Watch remains 'active' before serve-by deadline", $passes, $failures);

// Simulate time AFTER deadline (Thursday 12:00:00, serve-by passed unverified)
$simTimeAfter = new DateTimeImmutable('2026-10-22 12:00:00');
$evalAfter = WatchEngine::evaluateAll($simTimeAfter);
$freshWatchAfter = Watch::findById($watchNotice['id']);
assertTest($freshWatchAfter['state'] === 'triggered', "2.6 Watch flipped to 'triggered' after serve-by deadline passed", $passes, $failures);
assertTest(str_contains($freshWatchAfter['latest_trigger_reason'], 'passed unverified'), "2.7 Reason records deadline passed unverified", $passes, $failures);

// Verified Notice test: Notice verified before deadline should NOT trigger
$noticeVerified = Notice::create([
    'ticket_id' => 1,
    'unit_number' => '104',
    'tenant_name' => 'Alice Tenant',
    'entry_start' => '2026-10-23 11:00:00',
    'entry_end' => '2026-10-23 13:00:00',
    'reason' => 'Heating loop follow-up',
]);
Notice::update($noticeVerified['id'], [
    'status' => 'verified',
    'verified_at' => '2026-10-22 08:00:00',
    'verified_by_user_id' => 1
], 1, 'Tenant confirmed');

$watchVerified = Watch::create([
    'watch_type' => 'notice_deadline',
    'target_type' => 'notice',
    'target_id' => $noticeVerified['id'],
    'title' => "Verified Notice Deadline Watch",
]);
WatchEngine::evaluateAll($simTimeAfter);
$freshVerifiedWatch = Watch::findById($watchVerified['id']);
assertTest($freshVerifiedWatch['state'] === 'active', "2.8 Verified notice does NOT trigger deadline watch", $passes, $failures);

// 3. Acceptance Criterion 2: Freeze Watch (`weather_freeze`)
echo "\n--- 3. Acceptance Criterion 2: Freeze Watch (`weather_freeze`) ---\n";
$watchFreeze = Watch::create([
    'watch_type' => 'weather_freeze',
    'title' => 'Kingston Regional Freeze Watch',
    'config' => [
        'latitude' => 44.2312,
        'longitude' => -76.4860,
    ]
]);
assertTest($watchFreeze['id'] > 0, "3.1 Freeze watch created", $passes, $failures);

// Mock forecast WITH freeze: -3.5°C on 2026-10-20
$freezeForecast = [
    'hourly' => [
        'time' => ['2026-10-19T12:00', '2026-10-20T05:00', '2026-10-20T12:00'],
        'temperature_2m' => [5.0, -3.5, 2.0],
    ],
    'daily' => [
        'time' => ['2026-10-19', '2026-10-20', '2026-10-21'],
        'temperature_2m_min' => [3.0, -3.5, 1.0],
        'temperature_2m_max' => [10.0, 4.0, 8.0],
    ]
];

$simTimeWeather = new DateTimeImmutable('2026-10-19 10:00:00');
WatchEngine::evaluateAll($simTimeWeather, ['weather_forecast' => $freezeForecast]);
$freshFreezeWatch = Watch::findById($watchFreeze['id']);

assertTest($freshFreezeWatch['state'] === 'triggered', "3.2 Freeze watch flipped to 'triggered' with <= 0°C forecast inside 48h", $passes, $failures);
assertTest(str_contains($freshFreezeWatch['latest_trigger_reason'], '-3.5°C'), "3.3 Reason includes coldest temperature (-3.5°C)", $passes, $failures);
assertTest(str_contains($freshFreezeWatch['latest_trigger_reason'], '2026-10-20'), "3.4 Reason names the coldest date (2026-10-20)", $passes, $failures);
assertTest($freshFreezeWatch['latest_trigger_data']['coldest_date'] === '2026-10-20', "3.5 Data payload contains coldest_date '2026-10-20'", $passes, $failures);

// Non-freeze forecast: all temperatures > 0°C
$warmForecast = [
    'hourly' => [
        'time' => ['2026-10-19T12:00', '2026-10-20T05:00', '2026-10-20T12:00'],
        'temperature_2m' => [8.0, 4.5, 9.0],
    ],
    'daily' => [
        'time' => ['2026-10-19', '2026-10-20', '2026-10-21'],
        'temperature_2m_min' => [5.0, 4.5, 6.0],
        'temperature_2m_max' => [14.0, 15.0, 13.0],
    ]
];
$watchWarm = Watch::create([
    'watch_type' => 'weather_freeze',
    'title' => 'Warm Location Watch',
]);
WatchEngine::evaluateAll($simTimeWeather, ['weather_forecast' => $warmForecast]);
$freshWarmWatch = Watch::findById($watchWarm['id']);
assertTest($freshWarmWatch['state'] === 'active', "3.6 Warm forecast (>0°C) does NOT trigger freeze watch", $passes, $failures);

// 4. Acceptance Criterion 3: Digest Deduplication & Snooze Silence
echo "\n--- 4. Acceptance Criterion 3: Digest Deduplication & Snooze Silence ---\n";
// Daily digest
$digest1 = Watch::getDigest($simTimeWeather);
assertTest(count($digest1['items']) >= 2, "4.1 Digest contains triggered watches", $passes, $failures);

// Deduplication check: each watch appears exactly once
$watchIdsInDigest = array_column($digest1['items'], 'id');
$uniqueWatchIds = array_unique($watchIdsInDigest);
assertTest(count($watchIdsInDigest) === count($uniqueWatchIds), "4.2 Triggered watches appear in digest exactly once (deduped)", $passes, $failures);

// Snooze watch for 1 hour
$snoozedWatch = Watch::snooze($watchFreeze['id'], '1h', 1, $simTimeWeather);
assertTest($snoozedWatch['state'] === 'snoozed', "4.3 Watch state updated to 'snoozed'", $passes, $failures);
assertTest(!empty($snoozedWatch['snoozed_until']), "4.4 snoozed_until timestamp populated", $passes, $failures);

// Verify digest excludes snoozed watch
$digestDuringSnooze = Watch::getDigest($simTimeWeather->modify('+15 minutes'));
$snoozedIdFound = in_array($watchFreeze['id'], array_column($digestDuringSnooze['items'], 'id'), true);
assertTest(!$snoozedIdFound, "4.5 Snoozed watch is silenced and does NOT appear in active digest", $passes, $failures);

// Re-evaluating while snooze is active must NOT re-trigger it
WatchEngine::evaluateAll($simTimeWeather->modify('+20 minutes'), ['weather_forecast' => $freezeForecast]);
$freshStillSnoozed = Watch::findById($watchFreeze['id']);
assertTest($freshStillSnoozed['state'] === 'snoozed', "4.6 Evaluation while snoozed preserves snooze state without re-triggering", $passes, $failures);

// Advance time past snooze expiry (e.g. +70 minutes)
$simTimePostSnooze = $simTimeWeather->modify('+70 minutes');
WatchEngine::evaluateAll($simTimePostSnooze, ['weather_forecast' => $freezeForecast]);
$freshWokenWatch = Watch::findById($watchFreeze['id']);
assertTest($freshWokenWatch['state'] === 'triggered', "4.7 Watch wakes up and triggers once snooze expires", $passes, $failures);

// Test Acknowledge action
$ackedWatch = Watch::acknowledge($watchFreeze['id'], 1);
assertTest($ackedWatch['state'] === 'acknowledged', "4.8 Watch state changed to 'acknowledged'", $passes, $failures);
$digestAfterAck = Watch::getDigest($simTimePostSnooze);
$ackedIdFound = in_array($watchFreeze['id'], array_column($digestAfterAck['items'], 'id'), true);
assertTest(!$ackedIdFound, "4.9 Acknowledged watch is removed from active digest", $passes, $failures);

// 5. Acceptance Criterion 4: Quiet Hours Batching (22:00–07:00)
echo "\n--- 5. Acceptance Criterion 4: Quiet Hours Batching (22:00–07:00) ---\n";
// Create Notice 3 with serve-by passed at 22:30
$noticeNight = Notice::create([
    'ticket_id' => 1,
    'unit_number' => '104',
    'tenant_name' => 'Alice Tenant',
    'entry_start' => '2026-10-23 22:30:00',
    'entry_end' => '2026-10-23 23:30:00',
    'reason' => 'Emergency night check',
]);
$watchNight = Watch::create([
    'watch_type' => 'notice_deadline',
    'target_type' => 'notice',
    'target_id' => $noticeNight['id'],
    'title' => 'Late Night Notice Deadline Watch',
]);

// Evaluate at 23:00 (inside quiet hours 22:00–07:00)
$simTimeNight = new DateTimeImmutable('2026-10-22 23:00:00');
$evalNight = WatchEngine::evaluateAll($simTimeNight);
$freshNightWatch = Watch::findById($watchNight['id']);

assertTest($freshNightWatch['state'] === 'triggered', "5.1 Watch triggers during late night evaluation (23:00)", $passes, $failures);
assertTest($freshNightWatch['quiet_hours_delayed'] === true, "5.2 Watch marked with quiet_hours_delayed = true", $passes, $failures);

// Check digest at 23:00: quiet hours delayed triggers are batched into morning_batch
$digestNight = Watch::getDigest($simTimeNight);
assertTest($digestNight['is_quiet_hours'] === true, "5.3 Digest recognizes quiet hours are active", $passes, $failures);
$inMorningBatch = in_array($watchNight['id'], array_column($digestNight['morning_batch'], 'id'), true);
assertTest($inMorningBatch, "5.4 Night trigger placed in morning_batch instead of immediate alerts", $passes, $failures);

// Check digest next morning at 07:30: batched items appear in the morning digest
$simTimeMorning = new DateTimeImmutable('2026-10-23 07:30:00');
$digestMorning = Watch::getDigest($simTimeMorning);
assertTest($digestMorning['is_quiet_hours'] === false, "5.5 Quiet hours ended at 07:30", $passes, $failures);
$inMorningDigest = in_array($watchNight['id'], array_column($digestMorning['items'], 'id'), true);
assertTest($inMorningDigest, "5.6 Trigger firing at 23:00 surfaces cleanly in morning digest", $passes, $failures);

// 6. Reply Waiting & Scheduled Task Watch Types
echo "\n--- 6. Reply Waiting & Scheduled Task Watch Types ---\n";
// Reply waiting watch
$noticeSent = Notice::create([
    'ticket_id' => 1,
    'unit_number' => '104',
    'tenant_name' => 'Alice Tenant',
    'entry_start' => '2026-10-25 11:00:00',
    'entry_end' => '2026-10-25 13:00:00',
    'reason' => 'Furnace inspection',
]);
Notice::update($noticeSent['id'], ['status' => 'sent', 'sent_at' => '2026-10-20 08:00:00']);

$watchReply = Watch::create([
    'watch_type' => 'reply_waiting',
    'target_type' => 'notice',
    'target_id' => $noticeSent['id'],
    'config' => ['hours_threshold' => 12],
]);
// Evaluate 24h later
WatchEngine::evaluateAll(new DateTimeImmutable('2026-10-21 09:00:00'));
$freshReplyWatch = Watch::findById($watchReply['id']);
assertTest($freshReplyWatch['state'] === 'triggered', "6.1 reply_waiting watch triggered after exceeding hours threshold", $passes, $failures);
assertTest(str_contains($freshReplyWatch['latest_trigger_reason'], 'hours_waiting') || str_contains($freshReplyWatch['latest_trigger_reason'], 'sent'), "6.2 reply_waiting reason records elapsed waiting time", $passes, $failures);

// Scheduled task watch
$watchTask = Watch::create([
    'watch_type' => 'scheduled_task',
    'title' => 'Clean rooftop condenser coils',
    'config' => ['due_at' => '2026-10-20 17:00:00'],
]);
WatchEngine::evaluateAll(new DateTimeImmutable('2026-10-20 18:00:00'));
$freshTaskWatch = Watch::findById($watchTask['id']);
assertTest($freshTaskWatch['state'] === 'triggered', "6.3 scheduled_task watch triggered when due_at passed", $passes, $failures);

echo "\n========================================\n";
echo "Phase 6 Backend Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "All Phase 6 Backend Tests PASSED!\n";
    exit(0);
} else {
    echo "Phase 6 Backend Tests had failures!\n";
    exit(1);
}
