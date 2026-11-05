<?php
/**
 * CLI runner for updating Dependable Appliances phone number
 * Source: Jose confirmation Nov 4, 2026.
 * Usage:
 *   php cli/update_dependable_phone.php [--dry-run] [--apply]
 */

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

$apply = in_array('--apply', $argv, true);
$dryRun = in_array('--dry-run', $argv, true) || !$apply;

echo "=== Update Dependable Appliances Phone ===\n";
echo "Mode: " . ($apply ? "APPLY (LIVE WRITE)" : "DRY RUN (NO WRITES)") . "\n\n";

$pdo = App\Db::get();

// Step 0: Resolve Dependable row by name
$stmt = $pdo->prepare("SELECT * FROM supplier WHERE name = ?");
$stmt->execute(['Dependable Appliances']);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($rows) !== 1) {
    echo "ERROR: Expected exactly 1 Dependable Appliances row, found " . count($rows) . "\n";
    exit(1);
}

$row = $rows[0];
echo "Current row:\n";
echo "  ID: {$row['id']}\n";
echo "  Name: {$row['name']}\n";
echo "  Phone: {$row['phone']}\n";
echo "  Address: " . ($row['address'] ?? 'NULL') . "\n";
echo "  Account: " . ($row['account_number'] ?? 'NULL') . "\n";
echo "  Hours: {$row['hours']}\n\n";

$winningPhone = '613-389-2421';

if ($row['phone'] === $winningPhone) {
    echo "Phone is already set to {$winningPhone}. No change required.\n";
    exit(0);
}

if ($apply) {
    $now = gmdate('Y-m-d H:i:s');
    $upd = $pdo->prepare("UPDATE supplier SET phone = ?, updated_at = ? WHERE id = ?");
    $upd->execute([$winningPhone, $now, $row['id']]);
    echo "Successfully updated phone to {$winningPhone} on supplier ID {$row['id']}.\n";
} else {
    echo "DRY RUN: Would update phone from '{$row['phone']}' to '{$winningPhone}'.\n";
}

echo "Done.\n";
