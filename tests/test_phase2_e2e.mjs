import { spawn } from 'child_process';
import { ApiClient } from '../src/api/client.ts';

// Mock minimal sessionStorage for Node environment
global.window = {
  sessionStorage: {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  }
};

const passes = [];
const failures = [];

function assertTest(condition, desc) {
  if (condition) {
    passes.push(desc);
    console.log(`[PASS] ${desc}`);
  } else {
    failures.push(desc);
    console.error(`[FAIL] ${desc}`);
  }
}

async function runE2E() {
  console.log("=== Running Phase 2 End-to-End API Integration Tests ===\n");

  const port = 8897;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);
  
  // Wait 450ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 1. Health check
    const health = await client.health();
    assertTest(health.status === 'ok', "0.1 Slim server /api/health is live");

    // 2. Setup 5+ tickets across 3 buildings
    console.log("\n--- 1. Proximity Batch Ordering (5+ tickets, 3 sites) ---");
    const t1 = await client.createTicket({
      wo_number: 'WO-E2E-101',
      title: 'Site 1: Air handler filter replacement',
      building_id: 1,
      unit_id: 326,
      priority: 'urgent',
      verified_scope: 'Filter clogged, indoor unit starving for airflow',
    });

    const t2 = await client.createTicket({
      wo_number: 'WO-E2E-301',
      title: 'Site 3: Condenser fan motor vibrating',
      building_id: 3,
      unit_id: 352,
      priority: 'low',
      verified_scope: 'Check mounting bracket on roof condenser',
    });

    const t3 = await client.createTicket({
      wo_number: 'WO-E2E-201',
      title: 'Site 2: Water leak under evaporator coil',
      building_id: 2,
      unit_id: 335,
      priority: 'urgent',
      verified_scope: 'Drain pan cracked, leaking into hallway closet',
    });

    const t4 = await client.createTicket({
      wo_number: 'WO-E2E-102',
      title: 'Site 1: Thermostat schedule reset',
      building_id: 1,
      unit_id: 322,
      priority: 'medium',
      verified_scope: 'Reprogram smart thermostat schedule',
    });

    const t5 = await client.createTicket({
      wo_number: 'WO-E2E-302',
      title: 'Site 3: Rooftop attic condensate clog & contactor swap',
      building_id: 3,
      unit_id: 347,
      priority: 'medium',
      verified_scope: 'Requires ladder for high attic access, drain auger for stubborn main trap clog, and new contactor part',
    });

    assertTest(t1 && t2 && t3 && t4 && t5, "1.1 Created 5 test tickets across buildings 1, 2, and 3");

    // Suggest batch
    const suggestion = await client.suggestRunSheetBatch({
      ticket_ids: [t1.id, t2.id, t3.id, t4.id, t5.id],
      start_time: '08:00'
    });

    assertTest(suggestion.blocks.length === 5, "1.2 Batch suggestion returned 5 time blocks");
    assertTest(suggestion.total_sites === 3, "1.3 Suggestion grouped across 3 unique sites");

    // Check clustering
    const bldgSeq = suggestion.blocks.map(b => b.building_id);
    const contiguousCount = bldgSeq.reduce((acc, curr, idx) => (idx === 0 || curr !== bldgSeq[idx - 1]) ? acc + 1 : acc, 0);
    assertTest(contiguousCount === 3, "1.4 Blocks are grouped contiguously by property (contiguous groups = 3)");
    assertTest(JSON.stringify(bldgSeq) !== JSON.stringify([1, 3, 2, 1, 3]), "1.5 Order optimizes site proximity, NOT creation order [1,3,2,1,3]");

    // 3. Notice legal gate status test
    console.log("\n--- 2. Notice Legal Gate Status (Green / Amber / Red) ---");
    // Verified notice for t1 -> green
    const nVerified = await client.createNotice({
      ticket_id: t1.id,
      building_id: 1,
      unit_id: 326,
      title: 'Notice for t1',
      entry_start: '2026-10-25 10:00:00',
      entry_end: '2026-10-25 12:00:00',
    });
    await client.updateNotice(nVerified.id, { status: 'verified' });

    // Unverified notice for t3 -> amber
    const nUnverified = await client.createNotice({
      ticket_id: t3.id,
      building_id: 2,
      unit_id: 335,
      title: 'Notice for t3',
      entry_start: '2026-10-26 14:00:00',
      entry_end: '2026-10-26 16:00:00',
    });

    // Check notice gate status via suggest batch
    const batchWithNotices = await client.suggestRunSheetBatch({
      ticket_ids: [t1.id, t3.id],
      start_time: '09:00'
    });

    const b1 = batchWithNotices.blocks.find(b => b.ticket_id === t1.id);
    const b3 = batchWithNotices.blocks.find(b => b.ticket_id === t3.id);

    assertTest(b1 && b1.notice_gate_status === 'green', "2.1 Verified notice block has notice_gate_status = green");
    assertTest(b1 && b1.notice_is_cleared === true, "2.2 Green block is cleared for visit");
    assertTest(b3 && b3.notice_gate_status === 'amber', "2.3 Unverified notice block has notice_gate_status = amber");
    assertTest(b3 && b3.notice_is_cleared === false, "2.4 Amber block is not yet cleared");

    // 4. E-Bike carry capacity test
    console.log("\n--- 3. E-Bike Carry Capacity Checker ---");
    const heavyBlock = suggestion.blocks.find(b => b.ticket_id === t5.id);
    assertTest(heavyBlock && heavyBlock.exceeds_carry_capacity === true, "3.1 Block requiring ladder + auger + parts flags exceeds_carry_capacity = true");
    assertTest(heavyBlock && heavyBlock.carry_warning === 'exceeds carry capacity — split or reschedule', "3.2 Warning matches 'exceeds carry capacity — split or reschedule'");

    // 5. Day Plan Run Sheet Creation and Closing Block (Actual vs Estimated Minutes)
    console.log("\n--- 4. Day Plan Run Sheet & Closing Block (Actual vs Estimate) ---");
    const runSheet = await client.createRunSheet({
      title: 'E2E Tuesday Service Run Sheet',
      scheduled_date: '2026-10-20',
      notes: 'Testing full day plan lifecycle',
      blocks: suggestion.blocks
    });

    assertTest(runSheet && runSheet.id, "4.1 Run sheet created successfully with ID " + runSheet.id);
    assertTest(runSheet.blocks && runSheet.blocks.length === 5, "4.2 Run sheet contains all 5 scheduled blocks");

    // Fetch run sheet by ID
    const fetchedSheet = await client.getRunSheet(runSheet.id);
    assertTest(fetchedSheet.title === 'E2E Tuesday Service Run Sheet', "4.3 GET /api/run-sheets/:id returns full detail");
    assertTest(fetchedSheet.rollup && fetchedSheet.rollup.total_blocks === 5, "4.4 Rollup reports 5 total blocks");

    // Close the first block: record actual minutes
    const targetBlock = fetchedSheet.blocks[0];
    const estMinutes = targetBlock.estimated_minutes;
    const closedBlock = await client.updateRunSheetBlock(runSheet.id, targetBlock.id, {
      status: 'completed',
      actual_minutes: estMinutes + 20,
      notes: 'Completed ahead of transit window, verified airflow'
    });

    assertTest(closedBlock.status === 'completed', "4.5 Block status updated to 'completed'");
    assertTest(closedBlock.actual_minutes === estMinutes + 20, "4.6 Block recorded actual minutes: " + closedBlock.actual_minutes);
    assertTest(closedBlock.variance_minutes === 20, "4.7 Block calculated variance: +20m");

    // Add a manual block to the run sheet
    console.log("\n--- 5. Add, Update, and Delete Run Sheet Blocks ---");
    const addedBlock = await client.addRunSheetBlock(runSheet.id, {
      title: 'Warehouse Parts Restock',
      building_id: 1,
      estimated_minutes: 30,
      required_tools: ['Hand Tools'],
      required_parts: ['Capacitors', 'Filters']
    });

    assertTest(addedBlock && addedBlock.id, "5.1 Added manual block to run sheet with ID " + addedBlock.id);

    // Delete the manual block
    const deleteRes = await client.deleteRunSheetBlock(runSheet.id, addedBlock.id);
    assertTest(deleteRes && deleteRes.deleted === true, "5.2 Deleted block successfully from run sheet");

    // List all run sheets
    const sheetsList = await client.getRunSheets();
    assertTest(Array.isArray(sheetsList) && sheetsList.length >= 1, "5.3 GET /api/run-sheets returns list of run sheets");

  } catch (err) {
    console.error("Test execution threw error:", err);
    failures.push("E2E exception: " + err.message);
  } finally {
    phpServer.kill();
  }

  console.log("\n========================================");
  console.log("Phase 2 E2E Summary:");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log("========================================\n");

  if (failures.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2E();
