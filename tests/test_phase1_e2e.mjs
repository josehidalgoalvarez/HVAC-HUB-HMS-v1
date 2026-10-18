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
  console.log("=== Running Phase 1 End-to-End API Integration Tests ===\n");

  const port = 8898;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);
  
  // Wait 400ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // Test 1: Intake a ticket from screenshot with verbatim_text + verified_scope (text)
    console.log("--- 1. Intake from Screenshot Photo & Scope (< 2 min flow) ---");
    const intakeRes = await client.intakeTicket({
      wo_number: 'WO-INTAKE-202',
      verbatim_text: 'Tenant states blower motor vibrating and making high-pitch squeal',
      verified_scope: 'Blower motor bearings seized. Replace 1/2 HP blower motor and run capacitor.',
      photo_url: '/uploads/screenshot_20261018.jpg',
      priority: 'high',
      building_id: 1,
      unit_id: 101
    });

    assertTest(intakeRes && intakeRes.id, "1.1 Intaked ticket returned with generated ID");
    assertTest(intakeRes.verbatim_text === 'Tenant states blower motor vibrating and making high-pitch squeal', "1.2 Raw verbatim text preserved");
    assertTest(intakeRes.verified_scope === 'Blower motor bearings seized. Replace 1/2 HP blower motor and run capacitor.', "1.3 Verified scope text confirmed and stored as text");
    assertTest(intakeRes.status === 'verified', "1.4 Ticket intaked with verified scope enters 'verified' state");

    // Test 2: Reproduce WO 19970 pattern (1 parent -> 4 children with distinct states)
    console.log("\n--- 2. WO 19970 Pattern: 1 Parent -> 4 Children ---");
    const parent = await client.createTicket({
      wo_number: 'WO-19970',
      title: 'Full HVAC Overhaul - 4-Unit Quadplex',
      priority: 'urgent',
      status: 'in-progress',
      building_id: 1
    });

    assertTest(parent.wo_number === 'WO-19970', "2.1 Parent ticket WO-19970 created");

    // Child 1: verified
    const c1 = await client.createChildTicket(parent.id, {
      title: 'Unit 1 Heat Pump Diagnostic',
      status: 'verified',
      priority: 'medium'
    });
    // Child 2: in-progress
    const c2 = await client.createChildTicket(parent.id, {
      title: 'Unit 2 Blower Replacement',
      status: 'in-progress',
      priority: 'high'
    });
    // Child 3: blocked
    const c3 = await client.createChildTicket(parent.id, {
      title: 'Unit 3 Coil Replacement',
      status: 'blocked',
      blocker_reason: 'Awaiting OEM 3-ton coil delivery',
      priority: 'high'
    });
    // Child 4: done
    const c4 = await client.createChildTicket(parent.id, {
      title: 'Unit 4 Line Set Flush',
      status: 'done',
      priority: 'low'
    });

    assertTest(c1.status === 'verified', "2.2 Child 1 state is 'verified'");
    assertTest(c2.status === 'in-progress', "2.3 Child 2 state is 'in-progress'");
    assertTest(c3.status === 'blocked', "2.4 Child 3 state is 'blocked'");
    assertTest(c4.status === 'done', "2.5 Child 4 state is 'done'");

    // Verify parent rollup
    const parentWithChildren = await client.getTicket(parent.id);
    assertTest(parentWithChildren.children && parentWithChildren.children.length === 4, "2.6 Parent returns all 4 children");
    const rollup = parentWithChildren.childrenRollup || parentWithChildren.rollup;
    assertTest(rollup.total === 4, "2.7 Rollup reflects 4 total sub-jobs");
    assertTest(rollup.done === 1, "2.8 Rollup reflects 1 done");
    assertTest(rollup.blocked === 1, "2.9 Rollup reflects 1 blocked");
    assertTest(rollup.in_progress === 1, "2.10 Rollup reflects 1 in-progress");

    // Test 3: Edit any field -> correction log shows old -> new with who/when
    console.log("\n--- 3. Field Edits & Append-Only Correction Audit Log ---");
    const updatedC1 = await client.updateTicket(c1.id, {
      title: 'Unit 1 Heat Pump Emergency Overhaul',
      priority: 'urgent',
      status: 'in-progress',
      reason: 'Refrigerant pressure dropped to 0 psi overnight'
    });

    assertTest(updatedC1.priority === 'urgent', "3.1 Ticket priority updated to 'urgent'");
    assertTest(updatedC1.status === 'in-progress', "3.2 Ticket status updated to 'in-progress'");

    const corrections = await client.getTicketCorrections(c1.id);
    assertTest(corrections.length >= 3, "3.3 Corrections recorded for modified fields");
    const priorityCorr = corrections.find(c => (c.field_name || c.fieldName) === 'priority');
    assertTest(priorityCorr && (priorityCorr.old_value || priorityCorr.oldValue) === 'medium' && (priorityCorr.new_value || priorityCorr.newValue) === 'urgent', "3.4 Priority correction records old ('medium') -> new ('urgent')");
    assertTest(priorityCorr.reason === 'Refrigerant pressure dropped to 0 psi overnight', "3.5 Reason for modification captured in audit log");

    // Test 4: Ticket with no WO number saves and links later
    console.log("\n--- 4. Unnumbered Ticket & Later Linking ---");
    const unnumbered = await client.createTicket({
      wo_number: null,
      title: 'Roof Heat Pump Noise Complaint',
      status: 'new',
      priority: 'medium',
      building_id: 1
    });

    assertTest(unnumbered.wo_number === null, "4.1 Unnumbered ticket saves with wo_number NULL");

    const linked = await client.updateTicket(unnumbered.id, {
      wo_number: 'WO-88772',
      reason: 'Work order number assigned by property manager'
    });

    assertTest(linked.wo_number === 'WO-88772', "4.2 Ticket successfully links to WO-88772 later");

    const unnumberedCorrections = await client.getTicketCorrections(unnumbered.id);
    const woCorr = unnumberedCorrections.find(c => (c.field_name || c.fieldName) === 'wo_number');
    assertTest(woCorr && (woCorr.new_value || woCorr.newValue) === 'WO-88772', "4.3 WO number linking audited in correction log");

    // Test 5: Yardi mirror & 7-day staleness
    console.log("\n--- 5. Yardi Sighting & Staleness ---");
    const freshTicket = await client.createTicket({
      wo_number: 'WO-YARDI-1',
      title: 'Filter Replacement',
      building_id: 1
    });

    assertTest(freshTicket.is_stale_yardi === false, "5.1 Fresh ticket (null last_seen_in_yardi) is neutral / not stale");
    assertTest(!freshTicket.yardi_warning, "5.2 Fresh ticket has no warning pill");

    const sightingRes = await client.recordYardiSighting(freshTicket.id, {
      wo_number: 'WO-YARDI-1',
      unit_raw: '101',
      description: 'Filter replacement scheduled',
      status: 'Open'
    });

    assertTest(sightingRes && sightingRes.ticket_id, "5.3 Yardi sighting stamped via POST /api/tickets/:id/sighting");

    // Test 6: Prioritized Ticket List Ordering
    console.log("\n--- 6. Prioritized Ordering (Safety First -> Closable Today -> Rest) ---");
    const allTickets = await client.getTickets();
    assertTest(allTickets.length > 0, "6.1 GET /api/tickets returns list");
    // Verify first ticket is urgent (safety)
    assertTest(allTickets[0].priority === 'urgent', "6.2 First item in list has priority 'urgent' (Safety First)");

    console.log("\n=========================================");
    console.log(`Total Passes: ${passes.length}`);
    console.log(`Total Failures: ${failures.length}`);

    if (failures.length > 0) {
      process.exit(1);
    }
    console.log("\nALL E2E ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!");
  } finally {
    phpServer.kill();
  }
}

runE2E().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
