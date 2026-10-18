<?php

declare(strict_types=1);

namespace App\Services;

/**
 * VehiclePlanner
 * Evaluates vehicle and cargo constraints for field dispatch,
 * specifically e-bike carry capacity limits for technicians.
 */
class VehiclePlanner
{
    /**
     * Maximum cargo weight limit for an e-bike setup (in lbs).
     */
    public const EBIKE_MAX_CARGO_LBS = 50.0;

    /**
     * Bulky equipment item weights (lbs).
     */
    public const TOOL_WEIGHTS = [
        'ladder' => 20.0,
        'step_ladder' => 15.0,
        'extension_ladder' => 28.0,
        'auger' => 28.0,
        'drain_auger' => 28.0,
        'snake' => 28.0,
        'vacuum_pump' => 18.0,
        'recovery_machine' => 22.0,
        'nitrogen_tank' => 16.0,
        'gauge_manifold' => 5.0,
        'multimeter' => 2.0,
        'hand_tools' => 12.0,
    ];

    /**
     * Standard part average weight (lbs) if not specified.
     */
    public const DEFAULT_PART_WEIGHT_LBS = 6.0;

    /**
     * Check if a block's tools and parts exceed e-bike carry capacity.
     *
     * Non-negotiable rule:
     * A block requiring auger + ladder + parts on an e-bike flags
     * "exceeds carry capacity — split or reschedule".
     *
     * @param array|string|null $tools List of tool names or comma-separated string
     * @param array|string|null $parts List of part names or comma-separated string
     * @return array Assessment with 'exceeds_carry_capacity', 'warning', 'reason', etc.
     */
    public static function checkBlockCarry(array|string|null $tools, array|string|null $parts): array
    {
        $toolList = self::normalizeList($tools);
        $partList = self::normalizeList($parts);

        $hasLadder = false;
        $hasAuger = false;
        $hasParts = count($partList) > 0;

        $totalWeight = 12.0; // Baseline standard technician tool pouch
        $bulkyItems = [];

        foreach ($toolList as $tool) {
            $toolLower = strtolower(trim($tool));
            if ($toolLower === '') {
                continue;
            }

            if (str_contains($toolLower, 'ladder')) {
                $hasLadder = true;
                $bulkyItems[] = 'Ladder';
                $totalWeight += self::TOOL_WEIGHTS['ladder'];
            } elseif (str_contains($toolLower, 'auger') || str_contains($toolLower, 'snake')) {
                $hasAuger = true;
                $bulkyItems[] = 'Drain Auger';
                $totalWeight += self::TOOL_WEIGHTS['auger'];
            } elseif (str_contains($toolLower, 'vacuum') || str_contains($toolLower, 'pump')) {
                $bulkyItems[] = 'Vacuum Pump';
                $totalWeight += self::TOOL_WEIGHTS['vacuum_pump'];
            } elseif (str_contains($toolLower, 'recovery')) {
                $bulkyItems[] = 'Recovery Machine';
                $totalWeight += self::TOOL_WEIGHTS['recovery_machine'];
            } else {
                $totalWeight += 3.0;
            }
        }

        foreach ($partList as $part) {
            $partLower = strtolower(trim($part));
            if ($partLower === '') {
                continue;
            }

            if (str_contains($partLower, 'compressor') || str_contains($partLower, 'motor')) {
                $totalWeight += 18.0;
                $bulkyItems[] = 'Heavy Part (' . $part . ')';
            } else {
                $totalWeight += self::DEFAULT_PART_WEIGHT_LBS;
            }
        }

        // Rule 1: ladder + auger + parts on e-bike strictly exceeds capacity
        $comboExceeded = ($hasLadder && $hasAuger && $hasParts);

        // Rule 2: weight exceeds e-bike max cargo lbs (50 lbs)
        $weightExceeded = $totalWeight > self::EBIKE_MAX_CARGO_LBS;

        $exceeds = $comboExceeded || $weightExceeded;

        $warning = null;
        $reason = null;

        if ($exceeds) {
            $warning = 'exceeds carry capacity — split or reschedule';
            if ($comboExceeded) {
                $reason = 'Combination of Ladder, Drain Auger, and Replacement Parts exceeds safe e-bike cargo capacity. Split job into separate visits or dispatch vehicle.';
            } else {
                $reason = sprintf(
                    'Total cargo load (%.1f lbs) exceeds safe e-bike limit (%.1f lbs) with bulky items: %s',
                    $totalWeight,
                    self::EBIKE_MAX_CARGO_LBS,
                    implode(', ', $bulkyItems)
                );
            }
        }

        return [
            'exceeds_carry_capacity' => $exceeds,
            'warning' => $warning,
            'reason' => $reason,
            'has_ladder' => $hasLadder,
            'has_auger' => $hasAuger,
            'has_parts' => $hasParts,
            'estimated_weight_lbs' => round($totalWeight, 1),
            'bulky_items' => $bulkyItems,
            'tools' => $toolList,
            'parts' => $partList,
        ];
    }

    /**
     * Normalize string or array into string array.
     */
    public static function normalizeList(array|string|null $input): array
    {
        if ($input === null) {
            return [];
        }

        if (is_array($input)) {
            return array_values(array_filter(array_map('trim', $input)));
        }

        $input = trim($input);
        if ($input === '') {
            return [];
        }

        // Handle JSON array
        if (str_starts_with($input, '[') && str_ends_with($input, ']')) {
            $decoded = json_decode($input, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map('trim', $decoded)));
            }
        }

        // Handle comma or newline separated
        $parts = preg_split('/[,;\n]+/', $input);
        return array_values(array_filter(array_map('trim', $parts ?: [])));
    }
}
