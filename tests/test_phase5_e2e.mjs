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
  console.log("=== Running Phase 5 End-to-End API Integration Tests ===\n");

  const port = 8899;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);
  
  // Wait 450ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // Create a ticket to link notice
    console.log("--- 1. Setup Linked Work Order ---");
    const ticket = await client.createTicket({
      wo_number: 'WO-NOTICE-2026',
      title: 'Water Heater Replacement in Utility Closet',
      priority: 'high',
      building_id: 1,
      unit_id: 326,
      verified_scope: 'Drain and swap 50gal electric water heater. Need 24h notice for unit entry.',
    });
    assertTest(ticket && ticket.id, "1.1 Ticket created with ID " + ticket.id);

    // Test 1: 24-Hour Rule Calculation
    console.log("\n--- 2. 24-Hour Rule Calculation (POST /api/notices) ---");
    const entryStartFriday = '2026-10-23 11:00:00';
    const entryEndFriday = '2026-10-23 13:00:00';
    const expectedThursdayDeadline = '2026-10-22 11:00:00';

    const notice = await client.createNotice({
      ticket_id: ticket.id,
      building_id: 1,
      unit_id: 326,
      title: 'Notice of Entry: Water Heater Replacement',
      content: 'Scheduled replacement between 11:00 and 13:00 on Friday.',
      entry_start: entryStartFriday,
      entry_end: entryEndFriday,
    });

    assertTest(notice && notice.id, "2.1 Notice created with ID " + notice.id);
    assertTest(notice.entry_start === entryStartFriday, "2.2 entry_start matches Friday 11:00");
    assertTest(notice.entry_end === entryEndFriday, "2.3 entry_end matches Friday 13:00");
    assertTest(notice.serve_by_deadline === expectedThursdayDeadline, "2.4 Serve-by deadline calculated 24h prior: Thursday 11:00");
    assertTest(notice.status === 'drafted', "2.5 Initial state is 'drafted'");
    assertTest(!!notice.drafted_at, "2.6 drafted_at timestamp populated automatically");

    // Test 2: State Progression & Timestamps (PATCH /api/notices/:id)
    console.log("\n--- 3. State Progression (drafted -> sent -> served -> verified) ---");
    
    // 3.1 Drafted -> Sent
    const sentNotice = await client.updateNotice(notice.id, {
      status: 'sent',
      reason: 'Notice sent to tenant email and dispatch queue',
    });
    assertTest(sentNotice.status === 'sent', "3.1 Status advanced to 'sent'");
    assertTest(!!sentNotice.sent_at, "3.2 sent_at timestamp stamped: " + sentNotice.sent_at);

    // 3.2 Sent -> Served
    const servedNotice = await client.updateNotice(notice.id, {
      status: 'served',
      served_method: 'Door Post (Taped)',
      reason: 'Physical notice taped to unit front door by tech',
    });
    assertTest(servedNotice.status === 'served', "3.3 Status advanced to 'served'");
    assertTest(!!servedNotice.served_at, "3.4 served_at timestamp stamped: " + servedNotice.served_at);
    assertTest(servedNotice.served_method === 'Door Post (Taped)', "3.5 served_method captured: " + servedNotice.served_method);

    // 3.3 Served -> Verified
    const verifiedNotice = await client.updateNotice(notice.id, {
      status: 'verified',
      reason: 'Verified by tenant phone acknowledgment',
    });
    assertTest(verifiedNotice.status === 'verified', "3.6 Status advanced to 'verified'");
    assertTest(!!verifiedNotice.verified_at, "3.7 verified_at timestamp stamped: " + verifiedNotice.verified_at);

    // Test 3: Gate Status API (GET /api/notices/:id/gate-status)
    console.log("\n--- 4. Gate Status API (GET /api/notices/:id/gate-status) ---");
    
    // Verified notice -> Green
    const gateStatus1 = await client.getNoticeGateStatus(notice.id);
    assertTest(gateStatus1.gate_status === 'green', "4.1 Verified notice returns gate_status 'green'");
    assertTest(gateStatus1.is_cleared === true, "4.2 Verified notice has is_cleared === true");

    // Overdue notice -> Red
    const overdueNotice = await client.createNotice({
      ticket_id: ticket.id,
      building_id: 1,
      unit_id: 1,
      title: 'Overdue Past Notice',
      entry_start: new Date(Date.now() - 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      entry_end: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '),
    });
    const gateStatusOverdue = await client.getNoticeGateStatus(overdueNotice.id);
    assertTest(gateStatusOverdue.gate_status === 'red', "4.3 Unverified notice past deadline returns gate_status 'red'");
    assertTest(gateStatusOverdue.is_cleared === false, "4.4 Overdue notice has is_cleared === false");

    // Pending notice -> Amber
    const pendingNotice = await client.createNotice({
      ticket_id: ticket.id,
      building_id: 1,
      unit_id: 1,
      title: 'Pending Future Notice',
      entry_start: new Date(Date.now() + 172800 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      entry_end: new Date(Date.now() + 180000 * 1000).toISOString().slice(0, 19).replace('T', ' '),
    });
    const gateStatusPending = await client.getNoticeGateStatus(pendingNotice.id);
    assertTest(gateStatusPending.gate_status === 'amber', "4.5 Unverified notice before deadline returns gate_status 'amber'");
    assertTest(gateStatusPending.is_cleared === false, "4.6 Pending notice has is_cleared === false");

    // Test 4: Ticket Detail Display Linkage (GET /api/tickets/:id)
    console.log("\n--- 5. Ticket Detail Display Linkage (GET /api/tickets/:id) ---");
    const ticketWithNotice = await client.getTicket(ticket.id);
    assertTest(!!ticketWithNotice.notice, "5.1 Ticket detail includes attached notice");
    assertTest(ticketWithNotice.notice.ticket_id === ticket.id, "5.2 Attached notice links to ticket_id " + ticket.id);
    assertTest(!!ticketWithNotice.notice_gate_status, "5.3 Ticket exposes notice_gate_status: " + ticketWithNotice.notice_gate_status);
    assertTest(!!ticketWithNotice.serve_by_deadline, "5.4 Ticket exposes serve_by_deadline: " + ticketWithNotice.serve_by_deadline);

    // Test 5: Notices List API (GET /api/notices)
    console.log("\n--- 6. Pipeline List API (GET /api/notices) ---");
    const allNotices = await client.getNotices();
    assertTest(Array.isArray(allNotices) && allNotices.length >= 3, "6.1 GET /api/notices returns all notices with gate status");
    assertTest(allNotices.some(n => n.gate_status === 'green'), "6.2 Notices include green (cleared)");
    assertTest(allNotices.some(n => n.gate_status === 'red'), "6.3 Notices include red (overdue)");
    assertTest(allNotices.some(n => n.gate_status === 'amber'), "6.4 Notices include amber (pending)");

    console.log("\n=== Phase 5 E2E Tests Summary ===");
    console.log("Total Passes: " + passes.length);
    console.log("Total Failures: " + failures.length);

    if (failures.length > 0) {
      process.exit(1);
    } else {
      console.log("\nAll Phase 5 E2E API tests PASSED!");
      process.exit(0);
    }
  } finally {
    phpServer.kill();
  }
}

runE2E().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
