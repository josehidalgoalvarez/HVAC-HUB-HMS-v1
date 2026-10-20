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

async function runHandoffE2E() {
  console.log("=== Running Batch A: Notice Handoff E2E Integration Tests ===\n");

  const port = 8911;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);

  // Wait 450ms for server to spin up
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 1. Create notice
    console.log("--- 1. Create Notice (Drafted) ---");
    const notice = await client.createNotice({
      building_id: 1,
      title: '24h Notice of Entry for HVAC Filter Replacement',
      content: 'Standard quarterly maintenance window',
      entry_start: '2026-10-25 09:00:00',
      entry_end: '2026-10-25 11:00:00',
    });

    assertTest(notice && notice.id, "1.1 Notice created successfully with ID " + notice.id);
    assertTest(notice.status === 'drafted', "1.2 Notice initial status is 'drafted'");
    assertTest(!!notice.drafted_at, "1.3 drafted_at timestamp is present");

    // 2. Hand off to a name
    console.log("\n--- 2. Hand Off to Staff (Drafted -> Handed Off) ---");
    const handedOffNotice = await client.updateNotice(notice.id, {
      status: 'handed_off',
      handed_off_to: 'Sarah Jenkins (Property Manager)',
      reason: 'Handed paper copy to PM for delivery',
    });

    assertTest(handedOffNotice.status === 'handed_off', "2.1 Status transitioned to 'handed_off'");
    assertTest(handedOffNotice.handed_off_to === 'Sarah Jenkins (Property Manager)', "2.2 handed_off_to recorded as Sarah Jenkins");
    assertTest(!!handedOffNotice.handed_off_at, "2.3 handed_off_at timestamp stamped");

    // Check watches for active alert
    const watches = await client.getWatches();
    const handoffWatch = watches.find(w => w.target_type === 'notice' && Number(w.target_id) === Number(notice.id) && w.watch_type === 'notice_handoff');
    assertTest(!!handoffWatch, "2.4 Active Watch created for notice handoff");
    assertTest(handoffWatch && handoffWatch.state === 'triggered', "2.5 Watch state is 'triggered'");

    // Check digest
    const digest = await client.getWatchDigest();
    const inDigest = digest.items.some(w => Number(w.id) === Number(handoffWatch.id));
    assertTest(inDigest, "2.6 Handoff alert present in proactive daily digest");

    // 3. Mark Sent
    console.log("\n--- 3. Mark Sent: Alert Clears & 24h Clock Starts ---");
    const sentNotice = await client.updateNotice(notice.id, {
      status: 'sent',
      reason: 'Notice sent to tenant',
    });

    assertTest(sentNotice.status === 'sent', "3.1 Status transitioned to 'sent'");
    assertTest(!!sentNotice.sent_at, "3.2 sent_at timestamp stamped");

    // Check that watch alert cleared
    const watchesAfterSent = await client.getWatches();
    const watchAfter = watchesAfterSent.find(w => Number(w.id) === Number(handoffWatch.id));
    assertTest(watchAfter && watchAfter.state === 'resolved', "3.3 Handoff watch automatically resolved after notice sent");

    const digestAfter = await client.getWatchDigest();
    const inDigestAfter = digestAfter.items.some(w => Number(w.id) === Number(handoffWatch.id));
    assertTest(!inDigestAfter, "3.4 Resolved watch removed from daily digest");

    // 4. Schedule Job
    console.log("\n--- 4. Schedule Job & Validate Entry Window ---");
    const scheduledNotice = await client.updateNotice(notice.id, {
      status: 'scheduled',
      reason: 'Work order scheduled for window',
    });

    assertTest(scheduledNotice.status === 'scheduled', "4.1 Status transitioned to 'scheduled'");
    assertTest(!!scheduledNotice.scheduled_at, "4.2 scheduled_at timestamp stamped");

    // Gate status: freshly sent (< 24h) should not be green cleared yet
    const gateStatus = await client.getNoticeGateStatus(notice.id);
    assertTest(gateStatus.gate_status === 'amber', "4.3 Immediate gate_status is 'amber' (24h clock running)");
    assertTest(gateStatus.is_cleared === false, "4.4 is_cleared is false until 24h clock elapses");

    console.log("\n=== Batch A Handoff E2E Summary ===");
    console.log(`Total Passes: ${passes.length}`);
    console.log(`Total Failures: ${failures.length}`);

    if (failures.length > 0) {
      process.exit(1);
    }
  } finally {
    phpServer.kill();
  }
}

runHandoffE2E().catch(err => {
  console.error(err);
  process.exit(1);
});
