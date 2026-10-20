<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\Watch;
use App\Models\Ticket;
use App\Services\WatchEngine;

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

echo "=== Running Batch A: Notice 4-State Handoff Lifecycle & Watch Alert Tests ===\n\n";

// Set up isolated SQLite test database
$testDbPath = __DIR__ . '/notice_lifecycle_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// Seed base records
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Lead Tech Jose', 'jose@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, '100 Days Rd', '100 Days Rd')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '204')");

$ticket = Ticket::create([
    'wo_number' => 'WO-HANDOFF-101',
    'title' => 'Heat Pump Reversing Valve Sticking',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'high',
    'verified_scope' => 'Replace 4-way valve in closet fan coil. 24h entry notice required.',
], 1);

// --- 1. Create Notice (Drafted) ---
echo "--- 1. Create Notice (Drafted) ---\n";
$entryStart = '2026-10-25 10:00:00';
$entryEnd = '2026-10-25 12:00:00';

$notice = Notice::create([
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => '24h Notice of Entry: Heat Pump Valve Repair',
    'content' => 'Technician access needed between 10:00 and 12:00.',
    'entry_start' => $entryStart,
    'entry_end' => $entryEnd,
], 1);

assertTest(!empty($notice['id']), "1.1 Notice created with ID {$notice['id']}", $passes, $failures);
assertTest($notice['status'] === Notice::STATUS_DRAFTED, "1.2 Initial status is 'drafted'", $passes, $failures);
assertTest(!empty($notice['drafted_at']), "1.3 drafted_at timestamp is auto-populated", $passes, $failures);
assertTest(empty($notice['handed_off_at']), "1.4 handed_off_at is initially null", $passes, $failures);
assertTest(empty($notice['sent_at']), "1.5 sent_at is initially null", $passes, $failures);
assertTest(empty($notice['scheduled_at']), "1.6 scheduled_at is initially null", $passes, $failures);

// --- 2. Hand Off to a Name & Raise Watch Alert ---
echo "\n--- 2. Hand Off to a Name & Raise Watch Alert ---\n";
$handoffRecipient = 'Sarah Jenkins (Property Manager)';
$noticeHandoff = Notice::update($notice['id'], [
    'status' => Notice::STATUS_HANDED_OFF,
    'handed_off_to' => $handoffRecipient,
    'reason' => 'Handed paper notice copy to onsite property manager for tenant delivery',
], 1);

assertTest($noticeHandoff['status'] === Notice::STATUS_HANDED_OFF, "2.1 Notice advanced to 'handed_off'", $passes, $failures);
assertTest(!empty($noticeHandoff['handed_off_at']), "2.2 handed_off_at timestamp is auto-stamped", $passes, $failures);
assertTest($noticeHandoff['handed_off_to'] === $handoffRecipient, "2.3 handed_off_to stored ('{$handoffRecipient}')", $passes, $failures);

// Verify alert in Watches
$handoffWatches = Watch::findAll([
    'target_type' => 'notice',
    'target_id' => (int) $notice['id'],
    'watch_type' => 'notice_handoff',
]);
assertTest(count($handoffWatches) >= 1, "2.4 Watch created for notice handoff", $passes, $failures);
$activeWatch = $handoffWatches[0];
assertTest($activeWatch['state'] === 'triggered', "2.5 Handoff watch state is 'triggered' (active alert)", $passes, $failures);
assertTest(str_contains($activeWatch['title'], 'handed off to Sarah Jenkins'), "2.6 Watch title names recipient ({$activeWatch['title']})", $passes, $failures);

// Verify it appears in active alert digest
$digest = Watch::getDigest();
$digestItemIds = array_map(fn($item) => (int)$item['id'], $digest['items']);
assertTest(in_array((int)$activeWatch['id'], $digestItemIds, true), "2.7 Handoff alert appears in proactive daily digest", $passes, $failures);

// Gate status during handoff: amber (clock has NOT started)
$gateHandoff = Notice::calculateGateStatus($noticeHandoff);
assertTest($gateHandoff['gate_status'] === 'amber', "2.8 Gate status during handoff is 'amber' (not cleared)", $passes, $failures);
assertTest($gateHandoff['is_cleared'] === false, "2.9 Entry is not cleared during handoff", $passes, $failures);
assertTest(str_contains($gateHandoff['reason'], 'HANDED OFF'), "2.10 Gate reason notes handoff state", $passes, $failures);

// --- 3. Mark Sent: Watch Alert Clears & 24h Clock Starts ---
echo "\n--- 3. Mark Sent: Alert Clears & 24h Legal Clock Starts ---\n";
$simulatedSentTime = '2026-10-24 09:00:00';
$noticeSent = Notice::update($notice['id'], [
    'status' => Notice::STATUS_SENT,
    'sent_at' => $simulatedSentTime,
    'reason' => 'Tenant acknowledged receipt of notice email & posted copy',
], 1);

assertTest($noticeSent['status'] === Notice::STATUS_SENT, "3.1 Notice advanced to 'sent'", $passes, $failures);
assertTest($noticeSent['sent_at'] === $simulatedSentTime, "3.2 sent_at timestamp set to {$simulatedSentTime}", $passes, $failures);

// Check that handoff watch is cleared / resolved
$clearedWatches = Watch::findAll([
    'target_type' => 'notice',
    'target_id' => (int) $notice['id'],
    'watch_type' => 'notice_handoff',
]);
$allResolved = true;
foreach ($clearedWatches as $w) {
    if ($w['state'] !== 'resolved') {
        $allResolved = false;
    }
}
assertTest($allResolved, "3.3 Handoff watch alert automatically resolved upon marking sent", $passes, $failures);

// Verify it no longer appears in active digest
$digestAfterSent = Watch::getDigest();
$digestAfterIds = array_map(fn($item) => (int)$item['id'], $digestAfterSent['items']);
assertTest(!in_array((int)$activeWatch['id'], $digestAfterIds, true), "3.4 Resolved handoff watch alert removed from active digest", $passes, $failures);

// Test 24h legal clock anchoring at sent_at:
// 1 hour after sent (09:00 -> 10:00 same day): 24h clock running, entry window NOT valid
$time1hAfterSent = strtotime($simulatedSentTime) + 3600;
$gate1h = Notice::calculateGateStatus($noticeSent, $time1hAfterSent);
assertTest($gate1h['gate_status'] === 'amber', "3.5 1h after sent: gate status is 'amber'", $passes, $failures);
assertTest($gate1h['is_cleared'] === false, "3.6 1h after sent: entry window is NOT cleared yet", $passes, $failures);
assertTest(str_contains($gate1h['reason'], '24h Legal clock running'), "3.7 Gate reason notes 24h clock running", $passes, $failures);

// --- 4. Schedule Job & Validate Entry Window Only After 24h ---
echo "\n--- 4. Schedule Job & Validate Entry Window After 24h ---\n";
$noticeScheduled = Notice::update($notice['id'], [
    'status' => Notice::STATUS_SCHEDULED,
    'reason' => 'Work order booked on technician run sheet',
], 1);

assertTest($noticeScheduled['status'] === Notice::STATUS_SCHEDULED, "4.1 Notice advanced to 'scheduled'", $passes, $failures);
assertTest(!empty($noticeScheduled['scheduled_at']), "4.2 scheduled_at timestamp is auto-stamped", $passes, $failures);

// 23 hours after sent: entry window still NOT validated (23h < 24h)
$time23hAfterSent = strtotime($simulatedSentTime) + (23 * 3600);
$gate23h = Notice::calculateGateStatus($noticeScheduled, $time23hAfterSent);
assertTest($gate23h['gate_status'] === 'amber', "4.3 23h after sent: gate status is still 'amber'", $passes, $failures);
assertTest($gate23h['is_cleared'] === false, "4.4 23h after sent: entry window NOT cleared", $passes, $failures);

// Exactly 24 hours after sent (2026-10-25 09:00:00): entry window VALIDATES!
$time24hAfterSent = strtotime($simulatedSentTime) + 86400;
$gate24h = Notice::calculateGateStatus($noticeScheduled, $time24hAfterSent);
assertTest($gate24h['gate_status'] === 'green', "4.5 Exactly 24h after sent: gate status is 'green'", $passes, $failures);
assertTest($gate24h['is_cleared'] === true, "4.6 Exactly 24h after sent: entry window is legally cleared", $passes, $failures);
assertTest(str_contains($gate24h['reason'], '24h legal notice period elapsed'), "4.7 Gate reason confirms 24h legal period elapsed", $passes, $failures);

// 26 hours after sent (2026-10-25 11:00:00, within entry window): entry window remains legally validated
$time26hAfterSent = strtotime($simulatedSentTime) + (26 * 3600);
$gate26h = Notice::calculateGateStatus($noticeScheduled, $time26hAfterSent);
assertTest($gate26h['gate_status'] === 'green' && $gate26h['is_cleared'] === true, "4.8 26h after sent: entry window remains legally cleared", $passes, $failures);

// --- 5. Backwards Compatibility for Existing Notices ---
echo "\n--- 5. Backwards Compatibility for Existing Notices ---\n";
// Legacy verified notice
$legacyNotice = Notice::create([
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Legacy Verified Notice',
    'entry_start' => '2026-10-20 10:00:00',
], 1);
Notice::update($legacyNotice['id'], ['status' => Notice::STATUS_VERIFIED], 1);
$gateLegacy = Notice::getGateStatus($legacyNotice['id']);
assertTest($gateLegacy['gate_status'] === 'green' && $gateLegacy['is_cleared'] === true, "5.1 Legacy verified notice loads and returns green cleared", $passes, $failures);

// Existing rows fetch with findAll
$allNotices = Notice::findAll();
assertTest(count($allNotices) >= 2, "5.2 Notice::findAll loads all rows with enriched gate status", $passes, $failures);

// --- 6. Summary ---
echo "\n=== Notice Handoff Lifecycle Test Summary ===\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (!empty($failures)) {
    echo "\nFailed tests:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
} else {
    echo "\nAll Batch A Notice Handoff Lifecycle tests PASSED!\n";
    exit(0);
}
