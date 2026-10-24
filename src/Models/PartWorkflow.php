<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * PartWorkflow Model
 * Handles parts ordering with auto-watches, arrival resolution,
 * and harvest-first vacancy appliance sourcing with stock transfers.
 */
class PartWorkflow
{
    /**
     * Order a part for a ticket.
     * Tied to building + unit + appliance + supplier.
     * Auto-creates a 'part_wait' watch and appends timeline event.
     */
    public static function orderPart(int $ticketId, array $data, ?int $userId = null): array
    {
        $ticket = Db::fetchOne(
            'SELECT id, wo_number, building_id, unit_id, title FROM `ticket` WHERE id = ?',
            [$ticketId]
        );

        if (!$ticket) {
            throw new RuntimeException("Ticket #{$ticketId} not found");
        }

        $partName = trim((string) ($data['part_name'] ?? 'Replacement Part'));
        $partNumber = !empty($data['part_number']) ? trim((string) $data['part_number']) : null;
        $supplier = trim((string) ($data['supplier'] ?? 'Dependable'));
        $orderRef = trim((string) ($data['order_ref'] ?? ('ORD-' . date('Ymd') . '-' . substr(uniqid(), -4))));
        $quantity = max(1, (int) ($data['quantity'] ?? 1));
        $applianceId = !empty($data['appliance_id']) ? (int) $data['appliance_id'] : null;
        $applianceType = !empty($data['appliance_type']) ? trim((string) $data['appliance_type']) : 'General Appliance';
        $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : null;
        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;

        $buildingId = (int) ($data['building_id'] ?? $ticket['building_id']);
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : (!empty($ticket['unit_id']) ? (int) $ticket['unit_id'] : null);

        // 1. Insert into ticket_part
        $sql = 'INSERT INTO `ticket_part` ('
             . '`ticket_id`, `building_id`, `unit_id`, `appliance_id`, `appliance_type`, '
             . '`part_number`, `part_name`, `quantity`, `supplier`, `order_ref`, `status`, '
             . '`ordered_at`, `unit_cost`, `notes`, `created_at`'
             . ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "ordered", datetime("now"), ?, ?, datetime("now"))';

        Db::execute($sql, [
            $ticketId,
            $buildingId,
            $unitId,
            $applianceId,
            $applianceType,
            $partNumber,
            $partName,
            $quantity,
            $supplier,
            $orderRef,
            $unitCost,
            $notes,
        ]);

        $ticketPartId = (int) Db::lastInsertId();

        // 2. Auto-create 'part_wait' watch
        $woLabel = $ticket['wo_number'] ? "[WO-{$ticket['wo_number']}]" : "Ticket #{$ticketId}";
        $watchTitle = "Part Wait: {$partName} ({$woLabel})";
        $watchDesc = "Waiting on {$partName} (Qty {$quantity}) from {$supplier} — Order Ref: {$orderRef}";

        $watch = Watch::create([
            'user_id' => $userId,
            'watch_type' => 'part_wait',
            'title' => $watchTitle,
            'description' => $watchDesc,
            'target_type' => 'ticket',
            'target_id' => $ticketId,
            'state' => 'active',
            'config' => json_encode([
                'ticket_part_id' => $ticketPartId,
                'supplier' => $supplier,
                'order_ref' => $orderRef,
                'part_name' => $partName,
                'part_number' => $partNumber,
                'quantity' => $quantity,
            ]),
        ]);

        $watchId = (int) ($watch['id'] ?? 0);

        // Link watch_id to ticket_part
        if ($watchId > 0) {
            Db::execute('UPDATE `ticket_part` SET watch_id = ? WHERE id = ?', [$watchId, $ticketPartId]);
        }

        // 3. Append timeline event: part_ordered
        TicketTimeline::append(
            $ticketId,
            TicketTimeline::EVENT_PART_ORDERED,
            'Jose (Tech)',
            "Ordered {$partName} from {$supplier} (Order Ref: {$orderRef})",
            [
                'ticket_part_id' => $ticketPartId,
                'part_name' => $partName,
                'part_number' => $partNumber,
                'supplier' => $supplier,
                'order_ref' => $orderRef,
                'watch_id' => $watchId,
            ]
        );

        // 4. Update ticket status / blocker reason to reflect part wait
        Db::execute(
            "UPDATE `ticket` SET blocker_reason = ?, status = 'pending_parts', updated_at = datetime('now') WHERE id = ? AND status NOT IN ('done', 'closed', 'closed-elsewhere')",
            ["Waiting on {$partName} ({$supplier} ref {$orderRef})", $ticketId]
        );

        return self::getPartById($ticketPartId);
    }

    /**
     * Mark a part arrived.
     * Resolves the part_wait watch and appends timeline event.
     */
    public static function markPartArrived(int $ticketPartId, string $actor = 'Jose (Tech)'): array
    {
        $part = Db::fetchOne('SELECT * FROM `ticket_part` WHERE id = ?', [$ticketPartId]);
        if (!$part) {
            throw new RuntimeException("Ticket part #{$ticketPartId} not found");
        }

        $ticketId = (int) $part['ticket_id'];
        $watchId = !empty($part['watch_id']) ? (int) $part['watch_id'] : null;
        $partName = $part['part_name'];

        // 1. Update ticket_part status to 'arrived'
        Db::execute(
            "UPDATE `ticket_part` SET status = 'arrived', arrived_at = datetime('now') WHERE id = ?",
            [$ticketPartId]
        );

        // 2. Resolve the associated watch
        if ($watchId) {
            Db::execute(
                "UPDATE `watch` SET state = 'resolved', resolved_at = datetime('now') WHERE id = ?",
                [$watchId]
            );
        } else {
            // Fallback: resolve active part_wait watches for this ticket
            Db::execute(
                "UPDATE `watch` SET state = 'resolved', resolved_at = datetime('now') "
                . "WHERE target_id = ? AND target_type = 'ticket' AND watch_type = 'part_wait' AND state = 'active'",
                [$ticketId]
            );
        }

        // 3. Append timeline event: part_arrived
        TicketTimeline::append(
            $ticketId,
            TicketTimeline::EVENT_PART_ARRIVED,
            $actor,
            "Part arrived: {$partName}",
            [
                'ticket_part_id' => $ticketPartId,
                'part_name' => $partName,
                'watch_id' => $watchId,
                'supplier' => $part['supplier'] ?? null,
                'order_ref' => $part['order_ref'] ?? null,
            ]
        );

        // 4. Clear blocker reason if no more parts waiting
        $remainingParts = (int) Db::fetchOne(
            "SELECT COUNT(*) as count FROM `ticket_part` WHERE ticket_id = ? AND status = 'ordered'",
            [$ticketId]
        )['count'];

        if ($remainingParts === 0) {
            Db::execute(
                "UPDATE `ticket` SET blocker_reason = NULL, status = 'verified', updated_at = datetime('now') "
                . "WHERE id = ? AND status = 'pending_parts'",
                [$ticketId]
            );
        }

        return self::getPartById($ticketPartId);
    }

    public static function getPartById(int $id): ?array
    {
        $p = Db::fetchOne('SELECT * FROM `ticket_part` WHERE id = ?', [$id]);
        return $p ?: null;
    }

    public static function getPartsForTicket(int $ticketId): array
    {
        return Db::fetchAll(
            'SELECT * FROM `ticket_part` WHERE ticket_id = ? ORDER BY id ASC',
            [$ticketId]
        );
    }

    /**
     * Vacancy Parts Sourcing (Harvest-first):
     * Searches for appliances installed in units whose occupancy_status is 'vacant'.
     * Ranked with stockpile hits BEFORE any buy-new option.
     */
    public static function searchHarvestCandidates(?string $query = null): array
    {
        $sql = 'SELECT a.id, a.name, a.brand, a.type, a.category, a.model_number, a.serial_number, '
             . 'a.status, a.image_url, a.rating_plate_url, a.manual_url, a.building_id, a.unit_id, '
             . 'b.name as building_name, u.unit_number, u.occupancy_status '
             . 'FROM `appliance` a '
             . 'JOIN `unit` u ON a.unit_id = u.id '
             . 'JOIN `building` b ON a.building_id = b.id '
             . "WHERE u.occupancy_status = 'vacant'";

        $params = [];
        if ($query !== null && trim($query) !== '') {
            $like = '%' . trim($query) . '%';
            $sql .= ' AND (a.name LIKE ? OR a.brand LIKE ? OR a.type LIKE ? OR a.category LIKE ? OR a.model_number LIKE ?)';
            $params = [$like, $like, $like, $like, $like];
        }

        $sql .= ' ORDER BY b.name ASC, u.unit_number ASC LIMIT 100';

        $rows = Db::fetchAll($sql, $params);

        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                'id' => (int) $r['id'],
                'appliance_id' => (int) $r['id'],
                'name' => $r['name'],
                'brand' => $r['brand'],
                'type' => $r['type'],
                'category' => $r['category'] ?: $r['type'],
                'model_number' => $r['model_number'],
                'serial_number' => $r['serial_number'],
                'building_id' => (int) $r['building_id'],
                'building_name' => $r['building_name'],
                'unit_id' => (int) $r['unit_id'],
                'unit_number' => $r['unit_number'],
                'occupancy_status' => $r['occupancy_status'],
                'occupancy_label' => 'Vacant unit',
                'source' => 'harvest',
                'source_type' => 'vacant_unit',
                'status' => $r['status'],
                'image_url' => $r['image_url'],
                'rating_plate_url' => $r['rating_plate_url'],
                'manual_url' => $r['manual_url'],
                'harvest_first_rank' => 1, // Ranked ahead of buy-new
            ];
        }

        return $results;
    }

    /**
     * Generalized Stock Transfer:
     * Moves items between ANY two stockpiles, or from a vacant unit into a stockpile/unit.
     * Records stock transfer and append-only correction for provenance.
     */
    public static function transferStock(array $data, ?int $userId = null): array
    {
        $sourceType = strtolower(trim((string) ($data['source_type'] ?? '')));
        // If appliance_id is provided without source_type, default to vacant_unit for backward compat
        if ($sourceType === '' && !empty($data['appliance_id'])) {
            $sourceType = 'vacant_unit';
        }

        if ($sourceType === 'stockpile') {
            return self::transferBetweenStockpiles($data, $userId);
        }

        // Vacant unit source (appliance transfer)
        return self::transferVacantAppliance($data, $userId);
    }

    /**
     * Transfer parts between stockpiles with inventory increment/decrement and audit log.
     */
    private static function transferBetweenStockpiles(array $data, ?int $userId = null): array
    {
        $sourceStockpileId = (int) ($data['source_stockpile_id'] ?? 0);
        $destStockpileId = (int) ($data['destination_stockpile_id'] ?? 0);
        $partId = (int) ($data['part_id'] ?? 0);
        $quantity = max(1, (int) ($data['quantity'] ?? 1));
        $transferredBy = trim((string) ($data['transferred_by'] ?? 'Jose (Tech)'));
        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;
        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;

        if ($sourceStockpileId <= 0 || $destStockpileId <= 0) {
            throw new RuntimeException("Source and destination stockpiles are required");
        }
        if ($sourceStockpileId === $destStockpileId) {
            throw new RuntimeException("Source and destination stockpiles cannot be identical");
        }
        if ($partId <= 0) {
            throw new RuntimeException("Part ID is required for stockpile transfer");
        }

        $sourceStockpile = Db::fetchOne('SELECT * FROM `stockpile` WHERE id = ?', [$sourceStockpileId]);
        $destStockpile = Db::fetchOne('SELECT * FROM `stockpile` WHERE id = ?', [$destStockpileId]);
        $part = Db::fetchOne('SELECT * FROM `part` WHERE id = ?', [$partId]);

        if (!$sourceStockpile || !$destStockpile || !$part) {
            throw new RuntimeException("Stockpile or Part not found");
        }

        $sourceAlloc = Db::fetchOne(
            'SELECT * FROM `part_stockpile` WHERE part_id = ? AND stockpile_id = ?',
            [$partId, $sourceStockpileId]
        );
        $sourceQty = (int) ($sourceAlloc['quantity'] ?? 0);
        if ($sourceQty < $quantity) {
            throw new RuntimeException("Insufficient stock at source stockpile ({$sourceQty} available, {$quantity} requested)");
        }

        // 1. Decrement source stockpile
        Db::execute(
            'UPDATE `part_stockpile` SET quantity = quantity - ?, updated_at = datetime("now") WHERE part_id = ? AND stockpile_id = ?',
            [$quantity, $partId, $sourceStockpileId]
        );

        // 2. Increment destination stockpile (insert row if not exists)
        $destAlloc = Db::fetchOne(
            'SELECT * FROM `part_stockpile` WHERE part_id = ? AND stockpile_id = ?',
            [$partId, $destStockpileId]
        );
        if ($destAlloc) {
            Db::execute(
                'UPDATE `part_stockpile` SET quantity = quantity + ?, updated_at = datetime("now") WHERE part_id = ? AND stockpile_id = ?',
                [$quantity, $partId, $destStockpileId]
            );
        } else {
            Db::execute(
                'INSERT INTO `part_stockpile` (part_id, stockpile_id, quantity, status, minimum, created_at, updated_at) '
                . 'VALUES (?, ?, ?, "available", 1, datetime("now"), datetime("now"))',
                [$partId, $destStockpileId, $quantity]
            );
        }

        $itemName = $part['name'] . ' (Part #' . ($part['part_number'] ?: $partId) . ')';

        // 3. Record stock transfer row
        $sql = 'INSERT INTO `stock_transfer` ('
             . '`source_type`, `source_stockpile_id`, `destination_type`, `destination_stockpile_id`, '
             . '`part_id`, `item_name`, `quantity`, `transferred_by`, `notes`, `created_at`'
             . ') VALUES ("stockpile", ?, "stockpile", ?, ?, ?, ?, ?, ?, datetime("now"))';

        Db::execute($sql, [
            $sourceStockpileId,
            $destStockpileId,
            $partId,
            $itemName,
            $quantity,
            $transferredBy,
            $notes,
        ]);

        $transferId = (int) Db::lastInsertId();

        // 4. Append-only correction audit for provenance
        Correction::record(
            'part',
            $partId,
            'stockpile_allocation',
            "{$sourceStockpile['name']} (qty: {$sourceQty})",
            "Transferred {$quantity} to {$destStockpile['name']}",
            $userId,
            "Stock transfer between stockpiles (#{$sourceStockpileId} -> #{$destStockpileId}): {$notes}"
        );

        // 5. If tied to a ticket, record timeline event
        if ($ticketId) {
            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_PART_ARRIVED,
                $transferredBy,
                "Transferred {$quantity}x {$itemName} from {$sourceStockpile['name']} to {$destStockpile['name']} (Transfer #{$transferId})",
                [
                    'transfer_id' => $transferId,
                    'part_id' => $partId,
                    'quantity' => $quantity,
                    'source_stockpile_id' => $sourceStockpileId,
                    'destination_stockpile_id' => $destStockpileId,
                ]
            );
        }

        return [
            'transfer_id' => $transferId,
            'source_type' => 'stockpile',
            'destination_type' => 'stockpile',
            'source_stockpile_id' => $sourceStockpileId,
            'destination_stockpile_id' => $destStockpileId,
            'part_id' => $partId,
            'item_name' => $itemName,
            'quantity' => $quantity,
            'transferred_by' => $transferredBy,
            'transferred_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Pull an appliance from a vacant unit (Stock Transfer).
     * Records stock transfer and append-only correction for provenance.
     */
    public static function transferVacantAppliance(array $data, ?int $userId = null): array
    {
        $applianceId = (int) ($data['appliance_id'] ?? 0);
        $appliance = Db::fetchOne('SELECT * FROM `appliance` WHERE id = ?', [$applianceId]);
        if (!$appliance) {
            throw new RuntimeException("Appliance #{$applianceId} not found");
        }

        $sourceUnitId = (int) ($appliance['unit_id'] ?? 0);
        $sourceBuildingId = (int) ($appliance['building_id'] ?? 0);

        $destType = strtolower(trim((string) ($data['destination_type'] ?? 'unit')));
        $destUnitId = !empty($data['destination_unit_id']) ? (int) $data['destination_unit_id'] : null;
        $destBuildingId = !empty($data['destination_building_id']) ? (int) $data['destination_building_id'] : null;
        $destStockpileId = !empty($data['destination_stockpile_id']) ? (int) $data['destination_stockpile_id'] : null;
        $transferredBy = trim((string) ($data['transferred_by'] ?? 'Jose (Tech)'));
        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;
        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;

        $itemName = $appliance['name'] . ' (' . $appliance['brand'] . ' ' . $appliance['type'] . ')';

        // 1. Record stock transfer
        $sql = 'INSERT INTO `stock_transfer` ('
             . '`source_type`, `source_unit_id`, `source_building_id`, `destination_type`, '
             . '`destination_unit_id`, `destination_building_id`, `destination_stockpile_id`, '
             . '`appliance_id`, `item_name`, `quantity`, `transferred_by`, `notes`, `created_at`'
             . ') VALUES ("vacant_unit", ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime("now"))';

        Db::execute($sql, [
            $sourceUnitId,
            $sourceBuildingId,
            $destType,
            $destUnitId,
            $destBuildingId,
            $destStockpileId,
            $applianceId,
            $itemName,
            $transferredBy,
            $notes,
        ]);

        $transferId = (int) Db::lastInsertId();

        // 2. Update appliance location
        if ($destType === 'unit' && $destUnitId) {
            Db::execute(
                'UPDATE `appliance` SET unit_id = ?, building_id = ?, location = ?, updated_at = datetime("now") WHERE id = ?',
                [$destUnitId, $destBuildingId, "Unit {$destUnitId}", $applianceId]
            );
        } else {
            Db::execute(
                'UPDATE `appliance` SET unit_id = NULL, building_id = ?, location = "Stockpile", updated_at = datetime("now") WHERE id = ?',
                [$destBuildingId ?: $sourceBuildingId, $applianceId]
            );
        }

        // 3. Append-only correction audit for provenance
        Correction::record(
            'appliance',
            $applianceId,
            'location',
            "Unit {$sourceUnitId} (Bld {$sourceBuildingId})",
            $destType === 'unit' ? "Unit {$destUnitId} (Bld {$destBuildingId})" : 'Stockpile',
            $userId,
            "Harvest stock transfer from vacant unit #{$sourceUnitId} to {$destType}: {$notes}"
        );

        // 4. If tied to a ticket, record timeline event
        if ($ticketId) {
            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_PART_ARRIVED,
                $transferredBy,
                "Harvested {$itemName} from vacant unit #{$sourceUnitId} (Transfer #{$transferId})",
                [
                    'transfer_id' => $transferId,
                    'appliance_id' => $applianceId,
                    'source_unit_id' => $sourceUnitId,
                    'destination_unit_id' => $destUnitId,
                ]
            );
        }

        return [
            'transfer_id' => $transferId,
            'appliance_id' => $applianceId,
            'item_name' => $itemName,
            'source_unit_id' => $sourceUnitId,
            'destination_type' => $destType,
            'destination_unit_id' => $destUnitId,
            'transferred_at' => date('Y-m-d H:i:s'),
        ];
    }
}
