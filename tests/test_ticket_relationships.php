<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;
use App\Models\Ticket;

Config::load();

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// Seed minimal building & 2 tickets
$pdo->exec("INSERT INTO building (id, name, address) VALUES (1, '18 Elm St', '18 Elm St')");
$pdo->exec("INSERT INTO ticket (id, building_id, title, status, priority) VALUES (101, 1, 'Ticket A', 'new', 'medium')");
$pdo->exec("INSERT INTO ticket (id, building_id, title, status, priority) VALUES (102, 1, 'Ticket B', 'in-progress', 'high')");
$pdo->exec("INSERT INTO ticket (id, building_id, title, status, priority) VALUES (103, 1, 'Ticket C', 'verified', 'low')");

$passes = 0;
$failures = 0;

function assertRel(bool $cond, string $label, int &$p, int &$f): void
{
    if ($cond) {
        $p++;
        echo "[PASS] {$label}\n";
    } else {
        $f++;
        echo "[FAIL] {$label}\n";
    }
}

echo "=== Running Ticket Relationship Tests ===\n\n";

// 1. Link creates the row + correction row
$rel = Ticket::linkRelated(101, 102, 1, 'Same manifold leak');
$rowCount = (int) Db::fetchOne('SELECT COUNT(*) as c FROM ticket_relationship')['c'];
$corrRow = Db::fetchOne("SELECT * FROM correction WHERE entity_type = 'ticket' AND entity_id = 101 AND field_name = 'related_ticket' ORDER BY id DESC LIMIT 1");
assertRel(
    !empty($rel['id']) && $rowCount === 1 && $corrRow !== null && $corrRow['new_value'] === '102',
    '1. Link creates ticket_relationship row and append-only correction row',
    $passes,
    $failures
);

// 2. Link is symmetric (readable from both sides)
$from101 = Ticket::getRelated(101);
$from102 = Ticket::getRelated(102);
assertRel(
    count($from101) === 1 && (int) $from101[0]['id'] === 102 &&
    count($from102) === 1 && (int) $from102[0]['id'] === 101,
    '2. Link is symmetric and readable from both sides (101 -> 102 and 102 -> 101)',
    $passes,
    $failures
);

// 3. Duplicate link rejected (both same order and reverse order)
$dupRejected = false;
try {
    Ticket::linkRelated(102, 101, 1);
} catch (RuntimeException $e) {
    $dupRejected = str_contains($e->getMessage(), 'already linked');
}
assertRel($dupRejected, '3. Duplicate link (reverse order 102->101) rejected', $passes, $failures);

// 4. Self-link rejected
$selfRejected = false;
try {
    Ticket::linkRelated(101, 101, 1);
} catch (RuntimeException $e) {
    $selfRejected = str_contains($e->getMessage(), 'itself');
}
assertRel($selfRejected, '4. Self-link (101->101) rejected', $passes, $failures);

// 5. Unknown ticket rejected
$unknownRejected = false;
try {
    Ticket::linkRelated(101, 9999, 1);
} catch (RuntimeException $e) {
    $unknownRejected = str_contains($e->getMessage(), 'not found');
}
assertRel($unknownRejected, '5. Unknown ticket (9999) rejected', $passes, $failures);

// 6. Unlink removes the row + writes a correction row
$unlinked = Ticket::unlinkRelated(102, 101, 1, 'Resolved separately');
$rowCountAfter = (int) Db::fetchOne('SELECT COUNT(*) as c FROM ticket_relationship')['c'];
$unlinkCorr = Db::fetchOne("SELECT * FROM correction WHERE entity_type = 'ticket' AND entity_id = 102 AND field_name = 'related_ticket' ORDER BY id DESC LIMIT 1");
assertRel(
    $unlinked === true && $rowCountAfter === 0 && $unlinkCorr !== null && $unlinkCorr['old_value'] === '101' && $unlinkCorr['new_value'] === null,
    '6. Unlink removes ticket_relationship row and writes append-only correction row',
    $passes,
    $failures
);

echo "\n=========================================\n";
echo "Ticket Relationship Tests: {$passes} Passed, {$failures} Failed\n";
echo "=========================================\n";

if ($failures > 0) {
    exit(1);
}
