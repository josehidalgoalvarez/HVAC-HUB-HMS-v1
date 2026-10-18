<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\Ticket;

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

echo "=== Running Phase 5 Notice-of-Entry & Legal Gate Backend Tests ===\n\n";

// Ensure clean test database
$testDbPath = __DIR__ . '/phase5_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// Seed building, unit, and tech user for test
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Tech Joe', 'joe@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, 'Oakridge Heights', '100 Oak St')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '402')");

// Create a ticket to link notice
$ticket = Ticket::create([
    'wo_number' => 'WO-LEGAL-777',
    'title' => 'Annual Heat Pump Inspection & Filter Replacement',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'medium',
    'verified_scope' => 'Entry required to inspect indoor air handler in closet',
], 1);

// --- 1. 24-Hour Rule Calculation ---
echo "--- 1. 24-Hour Rule Calculation ---\n";
// Window: Friday 2026-10-23 11:00 to 13:00
$entryStartFriday = '2026-10-23 11:00:00';
$entryEndFriday = '2026-10-23 13:00:00';
$expectedDeadlineThursday = '2026-10-22 11:00:00';

$notice1 = Notice::create([
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Notice of Entry: Heat Pump Inspection',
    'content' => 'Technician will arrive between 11:00 and 13:00 on Friday to service heat pump.',
    'entry_start' => $entryStartFriday,
    'entry_end' => $entryEndFriday,
], 1);

assertTest(!empty($notice1['id']), "1.1 Notice created successfully with ID {$notice1['id']}", $passes, $failures);
assertTest($notice1['entry_start'] === $entryStartFriday, "1.2 Notice entry_start matches input ({$entryStartFriday})", $passes, $failures);
assertTest($notice1['entry_end'] === $entryEndFriday, "1.3 Notice entry_end matches input ({$entryEndFriday})", $passes, $failures);
assertTest($notice1['serve_by_deadline'] === $expectedDeadlineThursday, "1.4 24h Rule: Friday 11:00 window computes serve_by_deadline as Thursday 11:00 ({$notice1['serve_by_deadline']})", $passes, $failures);
assertTest($notice1['status'] === 'drafted', "1.5 Initial state is 'drafted'", $passes, $failures);
assertTest(!empty($notice1['drafted_at']), "1.6 drafted_at timestamp is populated automatically ({$notice1['drafted_at']})", $passes, $failures);

// --- 2. State Progression: drafted -> sent -> served -> verified ---
echo "\n--- 2. State Progression & Timestamps with Audit Trail ---\n";

// Advance to 'sent'
$noticeSent = Notice::update($notice1['id'], [
    'status' => 'sent',
    'reason' => 'Notice sent via certified tenant email and dispatch queue',
], 1);
assertTest($noticeSent['status'] === 'sent', "2.1 Advanced to 'sent'", $passes, $failures);
assertTest(!empty($noticeSent['sent_at']), "2.2 sent_at timestamp stamped ({$noticeSent['sent_at']})", $passes, $failures);

// Advance to 'served'
$noticeServed = Notice::update($notice1['id'], [
    'status' => 'served',
    'served_method' => 'Door Post (Taped)',
    'reason' => 'Technician posted physical notice on primary unit entry door',
], 1);
assertTest($noticeServed['status'] === 'served', "2.3 Advanced to 'served'", $passes, $failures);
assertTest(!empty($noticeServed['served_at']), "2.4 served_at timestamp stamped ({$noticeServed['served_at']})", $passes, $failures);
assertTest($noticeServed['served_method'] === 'Door Post (Taped)', "2.5 served_method recorded ({$noticeServed['served_method']})", $passes, $failures);

// Advance to 'verified'
$noticeVerified = Notice::update($notice1['id'], [
    'status' => 'verified',
    'reason' => 'Service verified by lead technician: tenant acknowledged entry receipt',
], 1);
assertTest($noticeVerified['status'] === 'verified', "2.6 Advanced to 'verified'", $passes, $failures);
assertTest(!empty($noticeVerified['verified_at']), "2.7 verified_at timestamp stamped ({$noticeVerified['verified_at']})", $passes, $failures);
assertTest((int)$noticeVerified['verified_by_user_id'] === 1, "2.8 verified_by_user_id stamped with actor user ID (1)", $passes, $failures);

// Audit trail: verify correction table rows
$corrections = Correction::findByEntity('notice', $notice1['id']);
assertTest(count($corrections) >= 3, "2.9 Append-only corrections logged " . count($corrections) . " changes for notice", $passes, $failures);

$statusTransitions = array_values(array_filter($corrections, fn($c) => $c['field_name'] === 'status' && $c['old_value'] !== null));
assertTest(count($statusTransitions) === 3, "2.10 Exactly 3 state transition correction rows recorded", $passes, $failures);

// Verify transition values (DESC order: index 2=drafted->sent, 1=sent->served, 0=served->verified)
assertTest($statusTransitions[2]['old_value'] === 'drafted' && $statusTransitions[2]['new_value'] === 'sent', "2.11 Audit row 1: drafted -> sent", $passes, $failures);
assertTest($statusTransitions[1]['old_value'] === 'sent' && $statusTransitions[1]['new_value'] === 'served', "2.12 Audit row 2: sent -> served", $passes, $failures);
assertTest($statusTransitions[0]['old_value'] === 'served' && $statusTransitions[0]['new_value'] === 'verified', "2.13 Audit row 3: served -> verified", $passes, $failures);

// --- 3. Gate Status: Green / Amber / Red ---
echo "\n--- 3. Gate Status (Green / Amber / Red) ---\n";

// Notice 1 is verified -> should be green
$gate1 = Notice::getGateStatus($notice1['id']);
assertTest($gate1['gate_status'] === 'green', "3.1 Verified notice returns gate_status 'green' (cleared)", $passes, $failures);
assertTest(str_contains(strtolower($gate1['reason']), 'cleared'), "3.2 Gate reason explains legal clearance", $passes, $failures);

// Notice 2: Unverified and deadline is in the past -> should be RED
$pastDeadlineNotice = Notice::create([
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Past Deadline Entry Notice',
    'entry_start' => date('Y-m-d H:i:s', time() - 3600), // Entry was 1 hour ago
    'entry_end' => date('Y-m-d H:i:s', time() + 3600),
], 1);
$gatePast = Notice::getGateStatus($pastDeadlineNotice['id']);
assertTest($gatePast['gate_status'] === 'red', "3.3 Unverified notice past serve_by_deadline returns gate_status 'red' (overdue/blocked)", $passes, $failures);
assertTest(str_contains(strtolower($gatePast['reason']), 'overdue'), "3.4 Gate reason flags overdue violation", $passes, $failures);

// Notice 3: Unverified and deadline is in the future -> should be AMBER
$futureDeadlineNotice = Notice::create([
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Future Deadline Notice',
    'entry_start' => date('Y-m-d H:i:s', time() + 172800), // 2 days in future -> deadline is 1 day in future
    'entry_end' => date('Y-m-d H:i:s', time() + 172800 + 7200),
], 1);
$gateFuture = Notice::getGateStatus($futureDeadlineNotice['id']);
assertTest($gateFuture['gate_status'] === 'amber', "3.5 Unverified notice before serve_by_deadline returns gate_status 'amber' (pending deadline)", $passes, $failures);
assertTest(str_contains(strtolower($gateFuture['reason']), 'pending'), "3.6 Gate reason flags pending verification", $passes, $failures);

// --- 4. Ticket Linkage & Ticket Detail Display ---
echo "\n--- 4. Ticket Linkage & Detail Display ---\n";
$fetchedTicket = Ticket::findWithChildren($ticket['id']);
assertTest(!empty($fetchedTicket['notice']), "4.1 Ticket findWithChildren includes attached notice record", $passes, $failures);
assertTest((int)$fetchedTicket['notice']['ticket_id'] === (int)$ticket['id'], "4.2 Attached notice links back to ticket_id {$ticket['id']}", $passes, $failures);
assertTest(!empty($fetchedTicket['notice_gate_status']), "4.3 Ticket exposes notice_gate_status ('{$fetchedTicket['notice_gate_status']}')", $passes, $failures);
assertTest(!empty($fetchedTicket['serve_by_deadline']), "4.4 Ticket exposes serve_by_deadline ('{$fetchedTicket['serve_by_deadline']}')", $passes, $failures);

// --- 5. Summary ---
echo "\n=== Phase 5 Backend Tests Summary ===\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (!empty($failures)) {
    echo "\nFailed tests:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
} else {
    echo "\nAll Phase 5 backend acceptance tests PASSED!\n";
    exit(0);
}
