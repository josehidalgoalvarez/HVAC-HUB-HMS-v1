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
 * - log_part_use
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
            [
                'name' => 'log_part_use',
                'description' => 'Log part usage on a job: decrements stock (named stockpile, or first stockpile with stock), updates reorder flag, writes an append-only audit row, and records the usage against a job when given.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'part_id' => [
                            'type' => 'integer',
                            'description' => 'Numeric ID of the part (must exist)',
                        ],
                        'quantity' => [
                            'type' => 'integer',
                            'description' => 'Pieces used (must be > 0 and <= quantity_on_hand; defaults to 1)',
                        ],
                        'job_id' => [
                            'type' => 'integer',
                            'description' => 'Optional job ID the usage is recorded against (must exist if given)',
                        ],
                        'stockpile_id' => [
                            'type' => 'integer',
                            'description' => 'Optional stockpile to decrement (must exist and hold this part if given)',
                        ],
                        'reason' => [
                            'type' => 'string',
                            'description' => "Optional audit note (defaults to the model's 'Used N pcs on field job #J' / 'Manual stock consumption' text)",
                        ],
                    ],
                    'required' => ['part_id'],
                ],
            ],
            [
                'name' => 'add_to_buy_list',
                'description' => 'Add a manual item to the Buy List: part name and quantity, with optional part number, supplier, notes, and the ticket it is for.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'part_name' => [
                            'type' => 'string',
                            'description' => 'Part name (required, non-empty)',
                        ],
                        'quantity' => [
                            'type' => 'integer',
                            'description' => 'Pieces to buy (required, integer > 0)',
                        ],
                        'part_number' => [
                            'type' => 'string',
                            'description' => 'Optional manufacturer part number',
                        ],
                        'supplier' => [
                            'type' => 'string',
                            'description' => 'Optional supplier name (e.g. Dependable Appliances)',
                        ],
                        'notes' => [
                            'type' => 'string',
                            'description' => 'Optional note (e.g. which unit it is for)',
                        ],
                        'ticket_id' => [
                            'type' => 'integer',
                            'description' => 'Optional ticket ID the item is for (must exist if given)',
                        ],
                    ],
                    'required' => ['part_name', 'quantity'],
                ],
            ],
            [
                'name' => 'create_ticket',
                'description' => 'Create a ticket: title (or scope), building, optional unit/appliance/WO number, status, priority. Validates every reference before creating; writes the creation audit rows.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'title' => [
                            'type' => 'string',
                            'description' => 'Ticket title (required unless verified_scope or verbatim_text is given; derived from scope when missing)',
                        ],
                        'description' => [
                            'type' => 'string',
                            'description' => 'Optional free-text description',
                        ],
                        'verified_scope' => [
                            'type' => 'string',
                            'description' => 'Optional verified scope of work (also satisfies the title requirement)',
                        ],
                        'verbatim_text' => [
                            'type' => 'string',
                            'description' => 'Optional verbatim tenant/caller text (also satisfies the title requirement)',
                        ],
                        'building_id' => [
                            'type' => 'integer',
                            'description' => 'Building ID (required, must exist)',
                        ],
                        'unit_id' => [
                            'type' => 'integer',
                            'description' => 'Optional unit ID (must exist and belong to building_id when given; NULL = building-level ticket)',
                        ],
                        'appliance_id' => [
                            'type' => 'integer',
                            'description' => 'Optional appliance ID to link (must exist if given)',
                        ],
                        'wo_number' => [
                            'type' => 'string',
                            'description' => 'Optional Yardi WO number (must not already have a ticket)',
                        ],
                        'parent_ticket_id' => [
                            'type' => 'integer',
                            'description' => 'Optional parent ticket ID for a child ticket (must exist if given)',
                        ],
                        'status' => [
                            'type' => 'string',
                            'description' => 'Optional status: new (default), verified, in-progress, on-hold, blocked. Terminal states cannot be set at creation.',
                        ],
                        'priority' => [
                            'type' => 'string',
                            'description' => 'Optional priority: low, medium (default), high, critical',
                        ],
                        'blocked_reason' => [
                            'type' => 'string',
                            'description' => 'Required when status is blocked (non-empty)',
                        ],
                        'assigned_tech_id' => [
                            'type' => 'integer',
                            'description' => 'Optional tech user ID (must exist if given)',
                        ],
                        'work_exposure' => [
                            'type' => 'string',
                            'description' => 'Optional: indoor (default), exterior, exterior_ladder',
                        ],
                    ],
                    'required' => ['building_id'],
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

            case 'log_part_use':
                return $this->toolLogPartUse($id, $arguments, $request);

            case 'add_to_buy_list':
                return $this->toolAddToBuyList($id, $arguments);

            case 'create_ticket':
                return $this->toolCreateTicket($id, $arguments, $request);

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
     * Tool 9: log_part_use (Write tool)
     * Decrements stock, updates reorder status, writes append-only audit, records job usage when given.
     */
    private function toolLogPartUse(mixed $id, array $args, Request $request): Response
    {
        // 1. Validate part_id
        if (!isset($args['part_id']) || !is_numeric($args['part_id'])) {
            return $this->jsonRpcError($id, -32602, 'part_id is required and must be an integer');
        }
        $partId = (int) $args['part_id'];
        if ($partId <= 0) {
            return $this->jsonRpcError($id, -32602, "Invalid part_id: {$partId}");
        }

        $part = Db::fetchOne('SELECT id, name, part_number, quantity_on_hand, reorder_point FROM part WHERE id = ?', [$partId]);
        if (!$part) {
            return $this->jsonRpcError($id, -32602, "Part #{$partId} not found");
        }
        $qoh = (int) ($part['quantity_on_hand'] ?? 0);

        // 2. Validate quantity (defaults to 1, must be integer > 0)
        $quantity = 1;
        if (isset($args['quantity'])) {
            if (!is_numeric($args['quantity']) || (int) $args['quantity'] != $args['quantity']) {
                return $this->jsonRpcError($id, -32602, 'Quantity used must be an integer greater than zero');
            }
            $quantity = (int) $args['quantity'];
            if ($quantity <= 0) {
                return $this->jsonRpcError($id, -32602, 'Quantity used must be greater than zero');
            }
        }

        // 3. Over-use check: quantity must be <= quantity_on_hand
        if ($quantity > $qoh) {
            return $this->jsonRpcError($id, -32602, "Cannot use more than current stock ({$qoh} pcs)");
        }

        // 4. Validate job_id (when given)
        $jobId = null;
        if (isset($args['job_id']) && $args['job_id'] !== '' && $args['job_id'] !== null) {
            if (!is_numeric($args['job_id']) || (int) $args['job_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'job_id must be a positive integer');
            }
            $jobId = (int) $args['job_id'];
            $job = Db::fetchOne('SELECT id FROM job WHERE id = ?', [$jobId]);
            if (!$job) {
                return $this->jsonRpcError($id, -32602, "Job #{$jobId} not found");
            }
        }

        // 5. Validate stockpile_id (when given)
        $stockpileId = null;
        if (isset($args['stockpile_id']) && $args['stockpile_id'] !== '' && $args['stockpile_id'] !== null) {
            if (!is_numeric($args['stockpile_id']) || (int) $args['stockpile_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'stockpile_id must be a positive integer');
            }
            $stockpileId = (int) $args['stockpile_id'];
            $stockpile = Db::fetchOne('SELECT id, name FROM stockpile WHERE id = ?', [$stockpileId]);
            if (!$stockpile) {
                return $this->jsonRpcError($id, -32602, "Stockpile #{$stockpileId} not found");
            }

            // Must hold this part
            $partStockpile = Db::fetchOne('SELECT id, quantity FROM part_stockpile WHERE part_id = ? AND stockpile_id = ? LIMIT 1', [$partId, $stockpileId]);
            if (!$partStockpile) {
                return $this->jsonRpcError($id, -32602, "Part #{$partId} has no allocation at stockpile #{$stockpileId}");
            }
        }

        // 6. User attribution & reason
        $user = $request->getAttribute('user');
        $userId = isset($user['id']) ? (int) $user['id'] : null;
        $reason = isset($args['reason']) && trim((string) $args['reason']) !== '' ? trim((string) $args['reason']) : null;

        // 7. Call Model method Part::usePart
        try {
            $result = Part::usePart($partId, $quantity, $jobId, $stockpileId, $userId, $reason);
            return $this->jsonRpcToolContent($id, $result);
        } catch (\RuntimeException $e) {
            return $this->jsonRpcError($id, -32602, $e->getMessage());
        } catch (Throwable $e) {
            return $this->jsonRpcError($id, -32603, 'Failed to log part usage: ' . $e->getMessage());
        }
    }

    /**
     * Build MCP tools/call standard content response.
     */
    /**
     * Tool 10: add_to_buy_list (Write tool)
     * Adds a manual item to buy_list_item via BuyListItem::create().
     */
    private function toolAddToBuyList(mixed $id, array $args): Response
    {
        $partName = isset($args['part_name']) ? trim((string) $args['part_name']) : '';
        if ($partName === '') {
            return $this->jsonRpcError($id, -32602, 'Part name is required');
        }

        if (!isset($args['quantity']) || !is_numeric($args['quantity']) || (int) $args['quantity'] != $args['quantity']) {
            return $this->jsonRpcError($id, -32602, 'Quantity must be an integer greater than zero');
        }
        $quantity = (int) $args['quantity'];
        if ($quantity <= 0) {
            return $this->jsonRpcError($id, -32602, 'Quantity must be greater than zero');
        }

        $ticketId = null;
        if (isset($args['ticket_id']) && $args['ticket_id'] !== '' && $args['ticket_id'] !== null) {
            if (!is_numeric($args['ticket_id']) || (int) $args['ticket_id'] != $args['ticket_id'] || (int) $args['ticket_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'ticket_id must be a positive integer');
            }
            $ticketId = (int) $args['ticket_id'];
            $ticket = Db::fetchOne('SELECT id FROM ticket WHERE id = ?', [$ticketId]);
            if (!$ticket) {
                return $this->jsonRpcError($id, -32602, "Ticket #{$ticketId} does not exist");
            }
        }

        $optStr = static function (string $key) use ($args): ?string {
            if (!isset($args[$key]) || $args[$key] === null) {
                return null;
            }
            $trimmed = trim((string) $args[$key]);
            return $trimmed === '' ? null : $trimmed;
        };

        try {
            $created = \App\Models\BuyListItem::create([
                'part_name' => $partName,
                'quantity' => $quantity,
                'part_number' => $optStr('part_number'),
                'supplier' => $optStr('supplier'),
                'notes' => $optStr('notes'),
                'ticket_id' => $ticketId,
            ]);
            return $this->jsonRpcToolContent($id, $created);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return $this->jsonRpcError($id, -32602, $e->getMessage());
        } catch (\Throwable $e) {
            return $this->jsonRpcError($id, -32603, 'Failed to add item to buy list: ' . $e->getMessage());
        }
    }

    /**
     * Tool 11: create_ticket (Write tool)
     * Validates all references and creates a ticket via Ticket::create().
     */
    private function toolCreateTicket(mixed $id, array $args, Request $request): Response
    {
        // 1. Title / scope rule
        $title = isset($args['title']) ? trim((string) $args['title']) : '';
        $verifiedScope = isset($args['verified_scope']) ? trim((string) $args['verified_scope']) : '';
        $verbatimText = isset($args['verbatim_text']) ? trim((string) $args['verbatim_text']) : '';

        if ($title === '' && $verifiedScope === '' && $verbatimText === '') {
            return $this->jsonRpcError($id, -32602, 'Title or scope description is required');
        }
        if ($title === '') {
            $sourceText = $verifiedScope !== '' ? $verifiedScope : $verbatimText;
            $title = mb_strimwidth($sourceText, 0, 80, '...');
        }

        // 2. building_id (required, must exist)
        if (!isset($args['building_id']) || !is_numeric($args['building_id']) || (int) $args['building_id'] != $args['building_id'] || (int) $args['building_id'] <= 0) {
            return $this->jsonRpcError($id, -32602, 'building_id is required and must be a positive integer');
        }
        $buildingId = (int) $args['building_id'];
        $building = Db::fetchOne('SELECT id FROM building WHERE id = ?', [$buildingId]);
        if (!$building) {
            return $this->jsonRpcError($id, -32602, "Building #{$buildingId} not found");
        }

        // 3. unit_id (optional; must exist and belong to building_id)
        $unitId = null;
        if (isset($args['unit_id']) && $args['unit_id'] !== '' && $args['unit_id'] !== null) {
            if (!is_numeric($args['unit_id']) || (int) $args['unit_id'] != $args['unit_id'] || (int) $args['unit_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'unit_id must be a positive integer');
            }
            $unitId = (int) $args['unit_id'];
            $unit = Db::fetchOne('SELECT id, building_id FROM unit WHERE id = ?', [$unitId]);
            if (!$unit) {
                return $this->jsonRpcError($id, -32602, "Unit #{$unitId} not found");
            }
            if ((int) $unit['building_id'] !== $buildingId) {
                return $this->jsonRpcError($id, -32602, "Unit #{$unitId} does not belong to building #{$buildingId}");
            }
        }

        // 4. appliance_id (optional; must exist)
        $applianceId = null;
        if (isset($args['appliance_id']) && $args['appliance_id'] !== '' && $args['appliance_id'] !== null) {
            if (!is_numeric($args['appliance_id']) || (int) $args['appliance_id'] != $args['appliance_id'] || (int) $args['appliance_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'appliance_id must be a positive integer');
            }
            $applianceId = (int) $args['appliance_id'];
            $appliance = Db::fetchOne('SELECT id FROM appliance WHERE id = ?', [$applianceId]);
            if (!$appliance) {
                return $this->jsonRpcError($id, -32602, "Appliance #{$applianceId} not found");
            }
        }

        // 5. parent_ticket_id (optional; must exist)
        $parentTicketId = null;
        if (isset($args['parent_ticket_id']) && $args['parent_ticket_id'] !== '' && $args['parent_ticket_id'] !== null) {
            if (!is_numeric($args['parent_ticket_id']) || (int) $args['parent_ticket_id'] != $args['parent_ticket_id'] || (int) $args['parent_ticket_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'parent_ticket_id must be a positive integer');
            }
            $parentTicketId = (int) $args['parent_ticket_id'];
            $parent = Db::fetchOne('SELECT id FROM ticket WHERE id = ?', [$parentTicketId]);
            if (!$parent) {
                return $this->jsonRpcError($id, -32602, "Parent ticket #{$parentTicketId} not found");
            }
        }

        // 6. assigned_tech_id (optional; must exist)
        $assignedTechId = null;
        if (isset($args['assigned_tech_id']) && $args['assigned_tech_id'] !== '' && $args['assigned_tech_id'] !== null) {
            if (!is_numeric($args['assigned_tech_id']) || (int) $args['assigned_tech_id'] != $args['assigned_tech_id'] || (int) $args['assigned_tech_id'] <= 0) {
                return $this->jsonRpcError($id, -32602, 'assigned_tech_id must be a positive integer');
            }
            $assignedTechId = (int) $args['assigned_tech_id'];
            $tech = Db::fetchOne('SELECT id FROM users WHERE id = ?', [$assignedTechId]);
            if (!$tech) {
                return $this->jsonRpcError($id, -32602, "User #{$assignedTechId} not found");
            }
        }

        // 7. wo_number (optional; must not duplicate existing ticket)
        $woNumber = isset($args['wo_number']) ? trim((string) $args['wo_number']) : '';
        $woNumber = $woNumber === '' ? null : $woNumber;
        if ($woNumber !== null) {
            $existingWo = Db::fetchOne('SELECT id FROM ticket WHERE wo_number = ?', [$woNumber]);
            if ($existingWo) {
                return $this->jsonRpcError($id, -32602, "WO {$woNumber} already has ticket #{$existingWo['id']}");
            }
        }

        // 8. status (working states only)
        $allowedStatuses = ['new', 'verified', 'in-progress', 'on-hold', 'blocked'];
        $status = isset($args['status']) && trim((string) $args['status']) !== '' ? trim((string) $args['status']) : 'new';
        if (!in_array($status, $allowedStatuses, true)) {
            return $this->jsonRpcError($id, -32602, "Invalid status '{$status}'. Allowed at creation: " . implode(', ', $allowedStatuses));
        }

        // 9. blocked_reason required when status === 'blocked'
        $blockedReason = isset($args['blocked_reason']) ? trim((string) $args['blocked_reason']) : '';
        if ($status === 'blocked' && $blockedReason === '') {
            return $this->jsonRpcError($id, -32602, "A non-empty blocked_reason is required when status is 'blocked'");
        }

        // 10. priority
        $allowedPriorities = ['low', 'medium', 'high', 'critical'];
        $priority = isset($args['priority']) && trim((string) $args['priority']) !== '' ? trim((string) $args['priority']) : 'medium';
        if (!in_array($priority, $allowedPriorities, true)) {
            return $this->jsonRpcError($id, -32602, "Invalid priority '{$priority}'. Allowed: " . implode(', ', $allowedPriorities));
        }

        $userId = $request->getAttribute('user_id');
        $payload = [
            'title' => $title,
            'description' => isset($args['description']) ? trim((string) $args['description']) : null,
            'verified_scope' => $verifiedScope !== '' ? $verifiedScope : null,
            'verbatim_text' => $verbatimText !== '' ? $verbatimText : null,
            'building_id' => $buildingId,
            'unit_id' => $unitId,
            'appliance_id' => $applianceId,
            'wo_number' => $woNumber,
            'parent_ticket_id' => $parentTicketId,
            'status' => $status,
            'priority' => $priority,
            'blocked_reason' => $blockedReason !== '' ? $blockedReason : null,
            'assigned_tech_id' => $assignedTechId,
            'work_exposure' => isset($args['work_exposure']) && trim((string) $args['work_exposure']) !== '' ? trim((string) $args['work_exposure']) : 'indoor',
        ];

        try {
            $created = \App\Models\Ticket::create($payload, $userId ? (int) $userId : null);
            return $this->jsonRpcToolContent($id, $created);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return $this->jsonRpcError($id, -32602, $e->getMessage());
        } catch (\Throwable $e) {
            return $this->jsonRpcError($id, -32603, 'Failed to create ticket: ' . $e->getMessage());
        }
    }

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
