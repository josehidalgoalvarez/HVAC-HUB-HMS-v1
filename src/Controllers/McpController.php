<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Db;
use App\Models\Equipment;
use App\Models\Part;
use App\Models\Stockpile;
use App\Models\Ticket;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

/**
 * McpController
 *
 * Implements HVACHome MCP Server v2.
 * Transport: Streamable HTTP over JSON-RPC 2.0.
 * Protocol specification: 2024-11-05.
 *
 * Protected endpoint mounted at POST /api/mcp.
 * Guarded by Auth::requireRole() (Bearer token).
 *
 * Read-only tools (7):
 * - list_tickets
 * - get_ticket
 * - list_buildings
 * - get_unit_appliances
 * - search_parts
 * - get_stockpile
 * - get_counts
 *
 * Write tools (v2):
 * - record_move
 */
class McpController
{
    public const MCP_PROTOCOL_VERSION = '2024-11-05';
    public const SERVER_NAME = 'hvachome-mcp-server';
    public const SERVER_VERSION = '2.0.0';

    /**
     * Handle incoming JSON-RPC 2.0 POST requests.
     */
    public function handle(Request $request, Response $response): Response
    {
        $rawBody = (string) $request->getBody();
        $payload = json_decode($rawBody, true);

        if (!is_array($payload)) {
            return $this->jsonRpcError(null, -32700, 'Parse error: Invalid JSON');
        }

        // Handle single request vs notifications
        $id = $payload['id'] ?? null;
        $method = $payload['method'] ?? null;
        $params = $payload['params'] ?? [];

        if (!is_string($method)) {
            return $this->jsonRpcError($id, -32600, 'Invalid Request: Missing or non-string method');
        }

        try {
            switch ($method) {
                case 'initialize':
                    return $this->handleInitialize($id, $params);

                case 'notifications/initialized':
                    // Notifications do not return a result
                    $res = $response->withStatus(204);
                    return $res;

                case 'ping':
                    return $this->jsonRpcResult($id, new \stdClass());

                case 'tools/list':
                    return $this->handleToolsList($id);

                case 'tools/call':
                    return $this->handleToolsCall($id, $params, $request);

                default:
                    return $this->jsonRpcError($id, -32601, "Method not found: {$method}");
            }
        } catch (Throwable $e) {
            return $this->jsonRpcError($id, -32603, 'Internal error: ' . $e->getMessage());
        }
    }

    /**
     * MCP initialize method.
     */
    private function handleInitialize(mixed $id, array $params): Response
    {
        $clientProtocol = (string) ($params['protocolVersion'] ?? self::MCP_PROTOCOL_VERSION);

        $result = [
            'protocolVersion' => self::MCP_PROTOCOL_VERSION,
            'capabilities' => [
                'tools' => [
                    'listChanged' => false,
                ],
            ],
            'serverInfo' => [
                'name' => self::SERVER_NAME,
                'version' => self::SERVER_VERSION,
            ],
        ];

        return $this->jsonRpcResult($id, $result);
    }

    /**
     * MCP tools/list method: definitions for the 7 read-only tools.
     */
    private function handleToolsList(mixed $id): Response
    {
        $tools = [
            [
                'name' => 'list_tickets',
                'description' => 'List tickets with optional status, priority, and limit filters. Returns core ticket metadata including property and unit information.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'status' => [
                            'type' => 'string',
                            'description' => 'Filter by ticket status (e.g. new, in-progress, verified, blocked, done, closed, closed-elsewhere, archived-blocked)',
                        ],
                        'priority' => [
                            'type' => 'string',
                            'description' => 'Filter by ticket priority (urgent, high, medium, low)',
                        ],
                        'limit' => [
                            'type' => 'integer',
                            'description' => 'Maximum number of tickets to return (default 50)',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_ticket',
                'description' => 'Get full details for a single ticket by its ID, including timeline events, linked appliance, and rollup status.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => [
                            'type' => 'integer',
                            'description' => 'Unique numeric ID of the ticket',
                        ],
                    ],
                    'required' => ['id'],
                ],
            ],
            [
                'name' => 'list_buildings',
                'description' => 'List all buildings in the portfolio with unit counts, addresses, and complex assignments. Optionally filter by complex slug or numeric ID.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'complex_id' => [
                            'type' => 'string',
                            'description' => 'Filter by complex slug (e.g. "bd", "amherst", "elm-colborne") or numeric complex ID (1..10)',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_unit_appliances',
                'description' => 'Get installed/staged appliances for a specific unit resolved strictly by building and unit label. Returns appliance specs, status, and maintenance history.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'building' => [
                            'type' => 'string',
                            'description' => 'Building name or address (e.g. "1723 Bath Road", "511 Days Road", "18 Elm")',
                        ],
                        'unit' => [
                            'type' => 'string',
                            'description' => 'Unit number label (e.g. "266", "101", "411")',
                        ],
                    ],
                    'required' => ['building', 'unit'],
                ],
            ],
            [
                'name' => 'search_parts',
                'description' => 'Search parts catalog by exact appliance model number or part number. Returns verified fitment mappings and TBD category templates for the model.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'model' => [
                            'type' => 'string',
                            'description' => 'Exact appliance model number as found on rating plate (e.g. "FFCD2418US3A", "FFHT1826LS9", "HD663FWS", "JCBS250SM1SS")',
                        ],
                        'part_number' => [
                            'type' => 'string',
                            'description' => 'Exact part number (e.g. "A16944601", "240337103", "240338101", "WS01F11296")',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_stockpile',
                'description' => 'Get full inventory of a stockpile by ID, including allocated parts with quantities on hand, stored appliances, and equipment/tools.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => [
                            'type' => 'integer',
                            'description' => 'Numeric ID of the stockpile',
                        ],
                    ],
                    'required' => ['id'],
                ],
            ],
            [
                'name' => 'get_counts',
                'description' => 'Get live database row counts across all 13 canonical system tables (using canonical complexes table, plural).',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => new \stdClass(),
                ],
            ],
            [
                'name' => 'record_move',
                'description' => "Record an appliance movement (install / store / stage) with the app's proven rules. Enforces existence of appliance and destination, exactly one destination (unit_id or stockpile_id), disallows future movement dates, and records an append-only audit trail.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'appliance_id' => [
                            'type' => 'integer',
                            'description' => 'Numeric ID of the appliance to move (must exist)',
                        ],
                        'unit_id' => [
                            'type' => 'integer',
                            'description' => 'Destination unit numeric ID (mutually exclusive with stockpile_id)',
                        ],
                        'stockpile_id' => [
                            'type' => 'integer',
                            'description' => 'Destination stockpile numeric ID (mutually exclusive with unit_id)',
                        ],
                        'movement_date' => [
                            'type' => 'string',
                            'description' => 'Move date in YYYY-MM-DD format (defaults to today; future dates are rejected, backdated moves write an audit note)',
                        ],
                        'disposition' => [
                            'type' => 'string',
                            'enum' => ['installed', 'stored', 'staged'],
                            'description' => 'Movement disposition: installed | stored | staged (defaults to "stored" for stockpile destination, "installed" for unit destination)',
                        ],
                        'notes' => [
                            'type' => 'string',
                            'description' => 'Optional contextual notes for the move',
                        ],
                    ],
                    'required' => ['appliance_id'],
                ],
            ],
        ];

        return $this->jsonRpcResult($id, ['tools' => $tools]);
    }

    /**
     * MCP tools/call router.
     */
    private function handleToolsCall(mixed $id, array $params, Request $request): Response
    {
        $name = (string) ($params['name'] ?? '');
        $arguments = (array) ($params['arguments'] ?? []);

        switch ($name) {
            case 'list_tickets':
                return $this->toolListTickets($id, $arguments);

            case 'get_ticket':
                return $this->toolGetTicket($id, $arguments);

            case 'list_buildings':
                return $this->toolListBuildings($id, $arguments);

            case 'get_unit_appliances':
                return $this->toolGetUnitAppliances($id, $arguments);

            case 'search_parts':
                return $this->toolSearchParts($id, $arguments);

            case 'get_stockpile':
                return $this->toolGetStockpile($id, $arguments);

            case 'get_counts':
                return $this->toolGetCounts($id, $arguments);

            case 'record_move':
                return $this->toolRecordMove($id, $arguments, $request);

            default:
                return $this->jsonRpcError($id, -32602, "Unknown tool: {$name}");
        }
    }

    /**
     * Tool 1: list_tickets
     */
    private function toolListTickets(mixed $id, array $args): Response
    {
        $filters = [];
        if (!empty($args['status'])) {
            $filters['status'] = trim((string) $args['status']);
        }
        if (!empty($args['priority'])) {
            $filters['priority'] = trim((string) $args['priority']);
        }
        if (!empty($args['limit'])) {
            $filters['limit'] = (int) $args['limit'];
        }

        $tickets = Ticket::findAll($filters);

        $results = [];
        foreach ($tickets as $t) {
            $results[] = [
                'id' => (int) $t['id'],
                'wo_number' => $t['wo_number'] ?? null,
                'title' => $t['title'] ?? '',
                'status' => $t['status'] ?? '',
                'priority' => $t['priority'] ?? 'medium',
                'building_id' => $t['building_id'] !== null ? (int) $t['building_id'] : null,
                'building' => $t['building_name'] ?? null,
                'unit_id' => $t['unit_id'] !== null ? (int) $t['unit_id'] : null,
                'unit' => $t['unit_number'] ?? null,
                'appliance_id' => $t['appliance_id'] ?? null,
                'created_at' => $t['created_at'] ?? null,
                'updated_at' => $t['updated_at'] ?? null,
            ];
        }

        return $this->jsonRpcToolContent($id, $results);
    }

    /**
     * Tool 2: get_ticket
     */
    private function toolGetTicket(mixed $id, array $args): Response
    {
        if (empty($args['id'])) {
            return $this->jsonRpcError($id, -32602, 'Missing required argument: id');
        }

        $ticketId = (int) $args['id'];
        $ticket = Ticket::findWithChildren($ticketId);

        if (!$ticket) {
            return $this->jsonRpcToolContent($id, ['error' => "Ticket #{$ticketId} not found"]);
        }

        return $this->jsonRpcToolContent($id, $ticket);
    }

    /**
     * Tool 3: list_buildings
     */
    private function toolListBuildings(mixed $id, array $args): Response
    {
        $complexFilter = isset($args['complex_id']) ? trim((string) $args['complex_id']) : null;

        $complexMap = [];
        $complexSlugMap = [];
        try {
            $cRows = Db::fetchAll('SELECT id, name, slug FROM complexes ORDER BY id ASC');
            foreach ($cRows as $c) {
                $complexMap[(int) $c['id']] = $c['name'];
                $complexSlugMap[(int) $c['id']] = $c['slug'];
            }
        } catch (Throwable) {}

        $targetComplexId = null;
        if ($complexFilter !== null && $complexFilter !== '') {
            if (is_numeric($complexFilter)) {
                $targetComplexId = (int) $complexFilter;
            } else {
                foreach ($complexSlugMap as $cid => $slug) {
                    if (strcasecmp($slug, $complexFilter) === 0) {
                        $targetComplexId = $cid;
                        break;
                    }
                }
            }
        }

        if ($targetComplexId !== null) {
            $sql = 'SELECT b.*, (SELECT COUNT(*) FROM unit u WHERE u.building_id = b.id) as unit_count
                    FROM building b
                    WHERE b.complex_id = ?
                    ORDER BY b.id ASC';
            $rows = Db::fetchAll($sql, [$targetComplexId]);
        } else {
            $sql = 'SELECT b.*, (SELECT COUNT(*) FROM unit u WHERE u.building_id = b.id) as unit_count
                    FROM building b
                    ORDER BY b.id ASC';
            $rows = Db::fetchAll($sql);
        }

        $results = [];
        foreach ($rows as $b) {
            $cid = $b['complex_id'] !== null ? (int) $b['complex_id'] : null;
            $results[] = [
                'id' => (int) $b['id'],
                'name' => $b['name'],
                'address' => $b['address'],
                'complex_id' => $cid,
                'complex_name' => $cid !== null ? ($complexMap[$cid] ?? null) : null,
                'complex_slug' => $cid !== null ? ($complexSlugMap[$cid] ?? null) : null,
                'unit_count' => (int) ($b['unit_count'] ?? 0),
                'status' => $b['status'] ?? 'active',
            ];
        }

        return $this->jsonRpcToolContent($id, $results);
    }

    /**
     * Tool 4: get_unit_appliances
     * Resolves building and unit strictly by label (never hardcoded IDs).
     */
    private function toolGetUnitAppliances(mixed $id, array $args): Response
    {
        $buildingLabel = trim((string) ($args['building'] ?? ''));
        $unitLabel = trim((string) ($args['unit'] ?? ''));

        if ($buildingLabel === '' || $unitLabel === '') {
            return $this->jsonRpcError($id, -32602, 'Missing required arguments: building and unit are required labels');
        }

        // 1. Resolve building by label or address
        $bRow = Db::fetchOne(
            'SELECT id, name, address FROM building WHERE name LIKE ? OR address LIKE ? LIMIT 1',
            ["%{$buildingLabel}%", "%{$buildingLabel}%"]
        );

        if (!$bRow) {
            return $this->jsonRpcToolContent($id, [
                'error' => "Building not found matching label '{$buildingLabel}'",
                'building' => $buildingLabel,
                'unit' => $unitLabel,
                'appliances' => [],
            ]);
        }

        $buildingId = (int) $bRow['id'];

        // 2. Resolve unit by unit_number in that building
        $uRow = Db::fetchOne(
            'SELECT id, building_id, unit_number, occupancy_status, default_set_id FROM unit WHERE building_id = ? AND unit_number = ? LIMIT 1',
            [$buildingId, $unitLabel]
        );

        if (!$uRow) {
            return $this->jsonRpcToolContent($id, [
                'error' => "Unit '{$unitLabel}' not found in building '{$bRow['name']}'",
                'building' => $bRow['name'],
                'unit' => $unitLabel,
                'appliances' => [],
            ]);
        }

        $unitId = (int) $uRow['id'];

        // 3. Fetch appliances installed or staged at unit
        $appRows = Db::fetchAll(
            'SELECT a.* FROM appliance a WHERE a.unit_id = ? ORDER BY a.id ASC',
            [$unitId]
        );

        $appliances = [];
        foreach ($appRows as $a) {
            $appId = (int) $a['id'];

            // Movement history
            $movements = Stockpile::getApplianceMovements($appId);

            // Related tickets
            $tickets = Db::fetchAll(
                'SELECT id, wo_number, title, status, created_at FROM ticket WHERE appliance_id = ? ORDER BY id DESC',
                [$appId]
            );

            // Derive maintenance history
            $history = [];
            if (!empty($a['notes'])) {
                $history[] = [
                    'source' => 'appliance_note',
                    'date' => substr((string) ($a['updated_at'] ?? $a['created_at']), 0, 10),
                    'action' => $a['notes'],
                ];
            }
            foreach ($movements as $m) {
                $history[] = [
                    'source' => 'movement',
                    'date' => substr((string) ($m['movement_date'] ?? $m['created_at']), 0, 10),
                    'action' => "Appliance moved ({$m['disposition']}): " . ($m['notes'] ?? ''),
                    'ticket_id' => $m['ticket_id'] ?? null,
                ];
            }
            foreach ($tickets as $t) {
                $history[] = [
                    'source' => 'ticket',
                    'date' => substr((string) $t['created_at'], 0, 10),
                    'action' => "Ticket #{$t['id']} (" . ($t['wo_number'] ?? 'No WO') . "): {$t['title']} [{$t['status']}]",
                    'ticket_id' => (int) $t['id'],
                ];
            }

            $appliances[] = [
                'id' => $appId,
                'name' => $a['name'],
                'type' => $a['type'],
                'brand' => $a['brand'],
                'model_number' => $a['model_number'] ?? '',
                'serial_number' => $a['serial_number'] ?? '',
                'status' => $a['status'] ?? 'operational',
                'location' => $a['location'] ?? '',
                'notes' => $a['notes'] ?? '',
                'maintenance_history' => $history,
            ];
        }

        return $this->jsonRpcToolContent($id, [
            'building' => [
                'id' => $buildingId,
                'name' => $bRow['name'],
                'address' => $bRow['address'],
            ],
            'unit' => [
                'id' => $unitId,
                'unit_number' => $uRow['unit_number'],
                'occupancy_status' => $uRow['occupancy_status'],
                'default_set_id' => $uRow['default_set_id'],
            ],
            'appliances' => $appliances,
        ]);
    }

    /**
     * Tool 5: search_parts
     * Exact model matching or part number search. Returns verified fitments and TBD templates.
     */
    private function toolSearchParts(mixed $id, array $args): Response
    {
        $model = isset($args['model']) ? trim((string) $args['model']) : '';
        $partNumber = isset($args['part_number']) ? trim((string) $args['part_number']) : '';

        if ($model === '' && $partNumber === '') {
            return $this->jsonRpcError($id, -32602, 'At least one search parameter required: model or part_number');
        }

        $verifiedParts = [];

        if ($partNumber !== '') {
            $parts = Part::findAll(['q' => $partNumber]);
            foreach ($parts as $p) {
                if (strcasecmp((string) ($p['part_number'] ?? ''), $partNumber) === 0) {
                    $verifiedParts[] = $p;
                }
            }
        } elseif ($model !== '') {
            // Exact model search on compatible_models
            $allParts = Part::findAll();
            foreach ($allParts as $p) {
                $compat = $p['compatible_models'] ?? [];
                if (is_array($compat)) {
                    foreach ($compat as $cm) {
                        if (strcasecmp((string) $cm, $model) === 0) {
                            $verifiedParts[] = $p;
                            break;
                        }
                    }
                }
            }
        }

        // TBD Category templates reference for appliance models
        $tbdTemplatesByType = [
            'Dishwasher' => [
                'Drain pump',
                'Wash pump / motor',
                'Racks / trays',
                'Door latch',
                'Door gasket',
                'Hoses (inlet / drain)',
                'Spray arms',
                'Filters',
            ],
            'Refrigerator' => [
                'Crisper drawers',
                'Door shelves / bins',
                'Thermostat / cold control',
                'Defrost timer / control board',
                'Door gasket',
                'Evaporator fan motor',
                'Run capacitor / relay',
            ],
            'Range' => [
                'Bake element',
                'Broil element',
                'Surface element (6" / 8")',
                'Infinite switch',
                'Terminal block',
                'Oven door gasket',
                'Thermostat / sensor probe',
            ],
            'Heater' => [
                'Upper heating element',
                'Lower heating element',
                'Upper thermostat (ECO)',
                'Lower thermostat',
                'Temperature & Pressure (T&P) relief valve',
                'Drain valve',
                'Anode rod',
            ],
        ];

        return $this->jsonRpcToolContent($id, [
            'query' => [
                'model' => $model ?: null,
                'part_number' => $partNumber ?: null,
            ],
            'verified_parts' => $verifiedParts,
            'tbd_templates' => $tbdTemplatesByType,
        ]);
    }

    /**
     * Tool 6: get_stockpile
     */
    private function toolGetStockpile(mixed $id, array $args): Response
    {
        if (empty($args['id'])) {
            return $this->jsonRpcError($id, -32602, 'Missing required argument: id');
        }

        $stockpileId = (int) $args['id'];
        $stockpile = Stockpile::findById($stockpileId);

        if (!$stockpile) {
            return $this->jsonRpcToolContent($id, ['error' => "Stockpile #{$stockpileId} not found"]);
        }

        $parts = Stockpile::getParts($stockpileId);
        $appliances = Stockpile::getAppliances($stockpileId);
        $equipment = Equipment::findByStockpile($stockpileId);

        return $this->jsonRpcToolContent($id, [
            'stockpile' => $stockpile,
            'parts_allocations' => $parts,
            'stored_appliances' => $appliances,
            'equipment' => $equipment,
        ]);
    }

    /**
     * Tool 7: get_counts
     * Returns canonical counts across all 13 system tables (using canonical complexes table, plural).
     */
    private function toolGetCounts(mixed $id, array $args): Response
    {
        $counts = [
            'tickets' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM ticket')['c'],
            'timeline' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM ticket_timeline')['c'],
            'corrections' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM correction')['c'],
            'parts' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM part')['c'],
            'allocations' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM part_stockpile')['c'],
            'equipment' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM equipment')['c'],
            'appliances' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM appliance')['c'],
            'movements' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM appliance_movement')['c'],
            'stockpiles' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM stockpile')['c'],
            'units' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM unit')['c'],
            'default_sets' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM default_sets')['c'],
            'buildings' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM building')['c'],
            'complexes' => (int) Db::fetchOne('SELECT COUNT(*) as c FROM complexes')['c'],
        ];

        return $this->jsonRpcToolContent($id, $counts);
    }

    /**
     * Tool 8: record_move (Write tool)
     * Records an appliance movement (installed / stored / staged) with model validation.
     */
    private function toolRecordMove(mixed $id, array $args, Request $request): Response
    {
        // 1. Validate appliance_id
        if (!isset($args['appliance_id']) || !is_numeric($args['appliance_id'])) {
            return $this->jsonRpcError($id, -32602, 'appliance_id is required and must be an integer');
        }
        $applianceId = (int) $args['appliance_id'];
        if ($applianceId <= 0) {
            return $this->jsonRpcError($id, -32602, "Invalid appliance_id: {$applianceId}");
        }

        // Appliance must exist
        $appliance = Db::fetchOne('SELECT id, name, type, brand, model_number, status, location, stockpile_id, unit_id, building_id FROM appliance WHERE id = ?', [$applianceId]);
        if (!$appliance) {
            return $this->jsonRpcError($id, -32602, "Appliance #{$applianceId} not found");
        }

        // 2. Validate destination: exactly one of unit_id or stockpile_id
        $hasUnit = isset($args['unit_id']) && $args['unit_id'] !== '' && $args['unit_id'] !== null;
        $hasStockpile = isset($args['stockpile_id']) && $args['stockpile_id'] !== '' && $args['stockpile_id'] !== null;

        if (!$hasUnit && !$hasStockpile) {
            return $this->jsonRpcError($id, -32602, 'Exactly one destination required: provide either unit_id or stockpile_id, neither was provided');
        }
        if ($hasUnit && $hasStockpile) {
            return $this->jsonRpcError($id, -32602, 'Exactly one destination required: provide either unit_id or stockpile_id, not both');
        }

        $toUnitId = null;
        $toStockpileId = null;

        if ($hasUnit) {
            if (!is_numeric($args['unit_id']) || (int) $args['unit_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'unit_id must be a positive integer');
            }
            $toUnitId = (int) $args['unit_id'];
            $unitRow = Db::fetchOne('SELECT id, building_id, unit_number FROM unit WHERE id = ?', [$toUnitId]);
            if (!$unitRow) {
                return $this->jsonRpcError($id, -32602, "Destination unit #{$toUnitId} not found");
            }
        } else {
            if (!is_numeric($args['stockpile_id']) || (int) $args['stockpile_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'stockpile_id must be a positive integer');
            }
            $toStockpileId = (int) $args['stockpile_id'];
            $stockpileRow = Db::fetchOne('SELECT id, name, location FROM stockpile WHERE id = ?', [$toStockpileId]);
            if (!$stockpileRow) {
                return $this->jsonRpcError($id, -32602, "Destination stockpile #{$toStockpileId} not found");
            }
        }

        // 3. Movement date validation: default to today, reject future date
        $todayDate = gmdate('Y-m-d');
        $rawDate = isset($args['movement_date']) && trim((string) $args['movement_date']) !== ''
            ? trim((string) $args['movement_date'])
            : $todayDate;

        $dObj = \DateTimeImmutable::createFromFormat('Y-m-d', substr($rawDate, 0, 10));
        if (!$dObj || $dObj->format('Y-m-d') !== substr($rawDate, 0, 10)) {
            return $this->jsonRpcError($id, -32602, "Invalid movement_date format: '{$rawDate}'. Expected YYYY-MM-DD.");
        }
        $moveDateStr = $dObj->format('Y-m-d');
        if ($moveDateStr > $todayDate) {
            return $this->jsonRpcError($id, -32602, "Future move date rejected: cannot record moves in the future ({$moveDateStr}).");
        }

        // 4. Disposition resolution & validation
        // Defaults: 'stored' if stockpile destination; 'installed' if unit destination
        $disposition = isset($args['disposition']) && trim((string) $args['disposition']) !== ''
            ? trim((string) $args['disposition'])
            : ($hasStockpile ? 'stored' : 'installed');

        if (!in_array($disposition, ['installed', 'stored', 'staged'], true)) {
            return $this->jsonRpcError($id, -32602, "Invalid disposition: '{$disposition}'. Allowed values: installed, stored, staged");
        }

        if ($hasStockpile && $disposition !== 'stored') {
            return $this->jsonRpcError($id, -32602, "Invalid disposition for stockpile destination: must be 'stored' (got '{$disposition}')");
        }
        if ($hasUnit && !in_array($disposition, ['installed', 'staged'], true)) {
            return $this->jsonRpcError($id, -32602, "Invalid disposition for unit destination: must be 'installed' or 'staged' (got '{$disposition}')");
        }

        // 5. Auth context & moved_by
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $userName = isset($user['name']) ? trim((string) $user['name']) : 'Tech';
        $notes = isset($args['notes']) ? trim((string) $args['notes']) : '';

        // 6. Execute move through Model path (Stockpile::moveAppliance)
        $payload = [
            'to_unit_id' => $toUnitId,
            'to_stockpile_id' => $toStockpileId,
            'disposition' => $disposition,
            'movement_date' => $moveDateStr,
            'moved_by' => $userName !== '' ? $userName : 'Tech',
            'notes' => $notes,
        ];

        try {
            $moveResult = Stockpile::moveAppliance($applianceId, $payload, $userId);

            // Fetch updated appliance location and disposition
            $updatedAppliance = Db::fetchOne('SELECT id, status, location, stockpile_id, unit_id, building_id FROM appliance WHERE id = ?', [$applianceId]);

            $resultData = [
                'movement_id' => $moveResult['movement_id'],
                'appliance_id' => $applianceId,
                'disposition' => $disposition,
                'status' => $updatedAppliance['status'] ?? $disposition,
                'location' => $updatedAppliance['location'] ?? '',
                'to_unit_id' => $toUnitId,
                'to_stockpile_id' => $toStockpileId,
                'movement_date' => substr($moveResult['movement_date'], 0, 10),
                'is_backdated' => (bool) ($moveResult['is_backdated'] ?? false),
            ];

            return $this->jsonRpcToolContent($id, $resultData);
        } catch (Throwable $e) {
            return $this->jsonRpcError($id, -32603, 'Failed to record appliance movement: ' . $e->getMessage());
        }
    }

    /**
     * Build MCP tools/call standard content response.
     */
    private function jsonRpcToolContent(mixed $id, mixed $data): Response
    {
        return $this->jsonRpcResult($id, [
            'content' => [
                [
                    'type' => 'text',
                    'text' => json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
                ],
            ],
            'isError' => false,
        ]);
    }

    /**
     * Build JSON-RPC success response.
     * Emits raw JSON-RPC 2.0 object ({jsonrpc: '2.0', id, result}) directly
     * to satisfy strict MCP wire format specification (bypassing {data: ...} envelope).
     */
    private function jsonRpcResult(mixed $id, mixed $result): Response
    {
        $payload = [
            'jsonrpc' => '2.0',
            'id' => $id,
            'result' => $result,
        ];

        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_SLASHES));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    /**
     * Build JSON-RPC error response.
     */
    private function jsonRpcError(mixed $id, int $code, string $message, mixed $data = null): Response
    {
        $error = [
            'code' => $code,
            'message' => $message,
        ];
        if ($data !== null) {
            $error['data'] = $data;
        }

        $payload = [
            'jsonrpc' => '2.0',
            'id' => $id,
            'error' => $error,
        ];

        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_SLASHES));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }
}
