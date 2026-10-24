<?php

declare(strict_types=1);

namespace App\Services;

use App\Db;
use App\Models\Notice;
use App\Models\Ticket;
use Throwable;

/**
 * BatchSuggester
 * Groups open tickets by site proximity and builds a travel-aware,
 * notice-gated, capacity-checked schedule order for day-plans.
 */
class BatchSuggester
{
    /**
     * Default work block duration in minutes.
     */
    public const DEFAULT_BLOCK_MINUTES = 45;

    /**
     * Travel time buffer between different sites in minutes.
     */
    public const DEFAULT_TRAVEL_BUFFER_MINUTES = 20;

    /**
     * Suggest an optimal travel-ordered batch of time blocks from ticket IDs or open tickets.
     *
     * @param array $ticketIds List of ticket IDs to batch (or empty to fetch all open tickets)
     * @param string $startTime Base start time for the day (e.g. "09:00")
     * @return array Ordered list of suggested blocks with site clustering and travel estimates
     */
    public static function suggest(array $ticketIds = [], string $startTime = '09:00'): array
    {
        // 1. Fetch tickets
        $tickets = self::resolveTickets($ticketIds);
        if (empty($tickets)) {
            return [
                'total_tickets' => 0,
                'total_sites' => 0,
                'estimated_total_minutes' => 0,
                'blocks' => [],
            ];
        }

        // 2. Group tickets by site (building_id)
        $siteGroups = [];
        foreach ($tickets as $t) {
            $buildingId = (int) ($t['building_id'] ?? 1);
            if (!isset($siteGroups[$buildingId])) {
                $siteGroups[$buildingId] = [
                    'building_id' => $buildingId,
                    'building_name' => $t['building_name'] ?? "Building #{$buildingId}",
                    'address' => $t['building_address'] ?? ($t['address'] ?? 'Site Location'),
                    'tickets' => [],
                ];
            }
            $siteGroups[$buildingId]['tickets'][] = $t;
        }

        // 3. Sort tickets within each site (safety/urgent first, then verified, then unit)
        foreach ($siteGroups as &$group) {
            usort($group['tickets'], function ($a, $b) {
                // Urgent first
                $prioA = ($a['priority'] ?? '') === 'urgent' ? 1 : 2;
                $prioB = ($b['priority'] ?? '') === 'urgent' ? 1 : 2;
                if ($prioA !== $prioB) {
                    return $prioA <=> $prioB;
                }
                // Then unit order
                $unitA = $a['unit_number'] ?? '';
                $unitB = $b['unit_number'] ?? '';
                return strcmp((string) $unitA, (string) $unitB);
            });
        }
        unset($group);

        // 4. Order the site clusters
        // (Cluster order preserves geographic locality so tech stays at one site before moving)
        $orderedSites = array_values($siteGroups);

        // 5. Flatten into linear sequence of blocks with scheduled time windows
        $currentTime = strtotime(date('Y-m-d ') . $startTime . ':00');
        if ($currentTime === false) {
            $currentTime = strtotime(date('Y-m-d 09:00:00'));
        }

        $suggestedBlocks = [];
        $sortOrder = 1;
        $prevBuildingId = null;
        $totalWorkMinutes = 0;
        $totalTravelMinutes = 0;

        foreach ($orderedSites as $site) {
            $buildingId = $site['building_id'];

            foreach ($site['tickets'] as $ticket) {
                // If transitioning to a new site, add travel transit buffer
                $transitMinutes = 0;
                if ($prevBuildingId !== null && $prevBuildingId !== $buildingId) {
                    $transitMinutes = self::DEFAULT_TRAVEL_BUFFER_MINUTES;
                    $currentTime += ($transitMinutes * 60);
                    $totalTravelMinutes += $transitMinutes;
                }

                $estMinutes = (int) ($ticket['estimated_minutes'] ?? self::DEFAULT_BLOCK_MINUTES);
                if ($estMinutes <= 0) {
                    $estMinutes = self::DEFAULT_BLOCK_MINUTES;
                }

                $blockStart = date('H:i', $currentTime);
                $currentTime += ($estMinutes * 60);
                $blockEnd = date('H:i', $currentTime);
                $totalWorkMinutes += $estMinutes;

                // Notice legal gate status lookup for this ticket
                $noticeGate = self::resolveTicketNoticeGate((int) $ticket['id']);

                // Infer required tools and parts from ticket description/scope
                $inferredTools = self::inferToolsFromTicket($ticket);
                $inferredParts = self::inferPartsFromTicket($ticket);

                // Vehicle carry check (e-bike capacity)
                $carryCheck = VehiclePlanner::checkBlockCarry($inferredTools, $inferredParts);

                $suggestedBlocks[] = [
                    'sort_order' => $sortOrder++,
                    'ticket_id' => (int) $ticket['id'],
                    'wo_number' => $ticket['wo_number'] ?? null,
                    'title' => $ticket['title'],
                    'building_id' => $buildingId,
                    'building_name' => $site['building_name'],
                    'building_address' => $site['address'],
                    'unit_id' => !empty($ticket['unit_id']) ? (int) $ticket['unit_id'] : null,
                    'unit_number' => $ticket['unit_number'] ?? null,
                    'status' => 'pending',
                    'start_time' => $blockStart,
                    'end_time' => $blockEnd,
                    'estimated_minutes' => $estMinutes,
                    'actual_minutes' => null,
                    'travel_buffer_before_minutes' => $transitMinutes,
                    'is_site_transition' => ($prevBuildingId !== null && $prevBuildingId !== $buildingId),
                    
                    // Notice legal gate
                    'notice_id' => $noticeGate['notice_id'] ?? null,
                    'notice_status' => $noticeGate['notice_status'] ?? null,
                    'notice_gate_status' => $noticeGate['gate_status'],
                    'notice_is_cleared' => $noticeGate['is_cleared'],
                    'notice_gate_reason' => $noticeGate['reason'],

                    // E-bike carry check
                    'required_tools' => $inferredTools,
                    'required_parts' => $inferredParts,
                    'exceeds_carry_capacity' => $carryCheck['exceeds_carry_capacity'],
                    'carry_warning' => $carryCheck['warning'],
                    'carry_reason' => $carryCheck['reason'],
                    'estimated_weight_lbs' => $carryCheck['estimated_weight_lbs'],
                ];

                $prevBuildingId = $buildingId;
            }
        }

        return [
            'total_tickets' => count($tickets),
            'total_sites' => count($orderedSites),
            'estimated_work_minutes' => $totalWorkMinutes,
            'estimated_travel_minutes' => $totalTravelMinutes,
            'estimated_total_minutes' => $totalWorkMinutes + $totalTravelMinutes,
            'blocks' => $suggestedBlocks,
        ];
    }

    /**
     * Resolve full ticket records with building/unit information.
     */
    private static function resolveTickets(array $ticketIds): array
    {
        if (empty($ticketIds)) {
            // Fetch all open/actionable tickets
            return Ticket::findAll([
                'status' => 'verified',
            ]);
        }

        $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $sql = "SELECT t.*, 
                       b.name AS building_name, 
                       b.address AS building_address,
                       u.unit_number
                FROM ticket t
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                WHERE t.id IN ({$placeholders})";

        try {
            return Db::fetchAll($sql, array_map('intval', $ticketIds));
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Resolve notice gate status for a given ticket.
     */
    public static function resolveTicketNoticeGate(int $ticketId): array
    {
        try {
            $ticketInfo = Db::fetchOne(
                'SELECT t.id, t.unit_id, u.occupancy_status FROM ticket t LEFT JOIN unit u ON t.unit_id = u.id WHERE t.id = ?',
                [$ticketId]
            );

            if ($ticketInfo !== null && ($ticketInfo['occupancy_status'] ?? '') === 'vacant') {
                return [
                    'notice_id' => null,
                    'notice_status' => 'not_applicable',
                    'gate_status' => 'green',
                    'is_cleared' => true,
                    'reason' => 'Notice not applicable (vacant unit — no tenant to notify)',
                ];
            }

            $notice = Db::fetchOne(
                'SELECT id, status, serve_by_deadline, verified_at FROM notice WHERE ticket_id = ? ORDER BY id DESC LIMIT 1',
                [$ticketId]
            );

            if ($notice !== null) {
                $gate = Notice::calculateGateStatus($notice);
                return [
                    'notice_id' => (int) $notice['id'],
                    'notice_status' => $notice['status'],
                    'gate_status' => $gate['gate_status'],
                    'is_cleared' => $gate['is_cleared'],
                    'reason' => $gate['reason'],
                ];
            }
        } catch (Throwable) {
            // Fallback
        }

        return [
            'notice_id' => null,
            'notice_status' => 'none',
            'gate_status' => 'amber',
            'is_cleared' => false,
            'reason' => 'No notice on file. Verify unit entry permission before visit.',
        ];
    }

    /**
     * Infer tools required from scope and description text.
     */
    public static function inferToolsFromTicket(array $ticket): array
    {
        $text = strtolower(($ticket['title'] ?? '') . ' ' . ($ticket['verified_scope'] ?? '') . ' ' . ($ticket['verbatim_text'] ?? '') . ' ' . ($ticket['description'] ?? ''));
        $tools = [];

        if (str_contains($text, 'ladder') || str_contains($text, 'roof') || str_contains($text, 'high ceiling') || str_contains($text, 'loft')) {
            $tools[] = 'Ladder';
        }
        if (str_contains($text, 'auger') || str_contains($text, 'snake') || str_contains($text, 'clog') || str_contains($text, 'drain') || str_contains($text, 'condensate')) {
            $tools[] = 'Drain Auger';
        }
        if (str_contains($text, 'freon') || str_contains($text, 'refrigerant') || str_contains($text, 'charge') || str_contains($text, 'leak')) {
            $tools[] = 'Gauge Manifold';
            $tools[] = 'Vacuum Pump';
        }
        if (str_contains($text, 'wire') || str_contains($text, 'voltage') || str_contains($text, 'breaker') || str_contains($text, 'fuse')) {
            $tools[] = 'Multimeter';
        }

        return !empty($tools) ? array_unique($tools) : ['Hand Tools'];
    }

    /**
     * Infer parts from scope and description text.
     */
    public static function inferPartsFromTicket(array $ticket): array
    {
        $text = strtolower(($ticket['title'] ?? '') . ' ' . ($ticket['verified_scope'] ?? '') . ' ' . ($ticket['verbatim_text'] ?? ''));
        $parts = [];

        if (str_contains($text, 'capacitor')) {
            $parts[] = 'Dual Run Capacitor';
        }
        if (str_contains($text, 'contactor')) {
            $parts[] = 'Contactor';
        }
        if (str_contains($text, 'filter')) {
            $parts[] = 'Air Filter (16x25x1)';
        }
        if (str_contains($text, 'motor') || str_contains($text, 'blower')) {
            $parts[] = 'Blower Motor (1/2 HP)';
        }
        if (str_contains($text, 'thermostat')) {
            $parts[] = 'Smart Thermostat';
        }

        return array_unique($parts);
    }
}
