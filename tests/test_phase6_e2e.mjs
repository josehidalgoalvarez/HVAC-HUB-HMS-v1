import { spawn } from 'child_process';
import { ApiClient } from '../src/api/client.ts';

// Mock minimal window & sessionStorage for Node environment
global.window = {
  sessionStorage: {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  addEventListener() {},
  removeEventListener() {},
};

try {
  Object.defineProperty(global.navigator, 'onLine', {
    value: true,
    writable: true,
    configurable: true,
  });
} catch {
  Object.defineProperty(global, 'navigator', {
    value: { onLine: true },
    writable: true,
    configurable: true,
  });
}

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
  console.log("=== Running Phase 6 Proactive Watch Engine E2E Tests ===\n");

  const port = 8892;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);

  // Wait 450ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 0. Health check
    const health = await client.health();
    assertTest(health?.status === 'ok', "0.1 Slim server /api/health is live");

    // 1. Acceptance Criterion 1: Notice Deadline Watch
    console.log("\n--- 1. Acceptance Criterion 1: Notice Deadline Watch ---");
    // Create an unverified notice with entry_start in past or near future where serve-by has passed
    const ticket = await client.createTicket({
      wo_number: 'WO-W-101',
      title: 'Boiler safety valve relief',
      building_id: 1,
      unit_id: 326,
      priority: 'high',
    });
    assertTest(ticket?.id > 0, "1.1 Parent ticket created");

    const notice = await client.createNotice({
      ticket_id: ticket.id,
      unit_number: '273',
      tenant_name: 'Bob Miller',
      entry_start: '2026-10-23 10:00:00',
      entry_end: '2026-10-23 12:00:00',
      reason: 'Safety valve inspection',
    });
    assertTest(notice?.id > 0, "1.2 Notice created with serve-by deadline 2026-10-22 10:00:00");
    assertTest(notice?.status === 'drafted', "1.3 Notice is unverified (status drafted)");

    // Create notice_deadline watch
    const noticeWatch = await client.createWatch({
      watch_type: 'notice_deadline',
      target_type: 'notice',
      target_id: notice.id,
      title: `Notice #${notice.id} Deadline Alarm`,
    });
    assertTest(noticeWatch?.id > 0, "1.4 Notice deadline watch created via POST /api/watches");
    assertTest(noticeWatch?.state === 'active', "1.5 Watch initialized in 'active' state");

    // Evaluate BEFORE serve-by deadline (2026-10-22 08:00)
    const evalBefore = await client.evaluateWatches({
      simulated_time: '2026-10-22 08:00:00',
    });
    const watchBefore = await client.getWatch(noticeWatch.id);
    assertTest(watchBefore.state === 'active', "1.6 Watch remains 'active' before serve-by deadline");

    // Evaluate AFTER serve-by deadline (2026-10-22 11:30)
    const evalAfter = await client.evaluateWatches({
      simulated_time: '2026-10-22 11:30:00',
    });
    const watchAfter = await client.getWatch(noticeWatch.id);
    assertTest(watchAfter.state === 'triggered', "1.7 POST /api/watches/evaluate flips unverified notice watch to 'triggered'");
    assertTest(watchAfter.latest_trigger_reason?.includes('passed unverified'), "1.8 Trigger reason notes serve-by deadline passed unverified");

    // 2. Acceptance Criterion 2: Part Wait Watch (`part_wait`)
    console.log("\n--- 2. Acceptance Criterion 2: Part Wait Watch (`part_wait`) ---");
    const partTicket = await client.createTicket({
      title: 'Condenser fan motor replacement',
      status: 'pending_parts',
      priority: 'high',
    });
    const partWatch = await client.createWatch({
      watch_type: 'part_wait',
      title: 'Waiting on Fan Motor',
      target_type: 'ticket',
      target_id: partTicket.id,
      config: {
        ticket_id: partTicket.id,
        part_name: 'Condenser Fan Motor 1/3 HP',
      }
    });
    assertTest(partWatch?.id > 0, "2.1 part_wait watch created via POST /api/watches");

    await client.evaluateWatches({
      simulated_time: '2026-10-20 10:00:00',
    });
    const freshPart = await client.getWatch(partWatch.id);
    assertTest(freshPart.state === 'triggered', "2.2 Part wait watch flips to 'triggered' for pending_parts ticket");
    assertTest(freshPart.latest_trigger_reason?.includes('Fan Motor'), "2.3 Trigger reason names part");
    assertTest(Number(freshPart.latest_trigger_data?.ticket_id) === Number(partTicket.id), "2.4 Trigger data contains ticket_id");

    // 3. Acceptance Criterion 3: Digest Deduplication & Snooze Silence
    console.log("\n--- 3. Acceptance Criterion 3: Digest Deduplication & Snooze Silence ---");
    const digest = await client.getWatchDigest({
      simulated_time: '2026-10-20 10:00:00',
    });
    assertTest(Array.isArray(digest.items) && digest.items.length >= 2, "3.1 Digest returns triggered watches");

    // Check each watch appears exactly once (deduped)
    const itemIds = digest.items.map(w => w.id);
    const uniqueIds = Array.from(new Set(itemIds));
    assertTest(itemIds.length === uniqueIds.length, "3.2 Triggered watches appear in digest exactly once (deduped)");

    // Snooze the part wait watch for 1h
    const snoozed = await client.snoozeWatch(partWatch.id, '1h', '2026-10-20T10:00:00');
    assertTest(snoozed.state === 'snoozed', "3.3 Watch snoozed successfully via PATCH /api/watches/:id");
    assertTest(Boolean(snoozed.snoozed_until), "3.4 snoozed_until timestamp recorded");

    // Verify snoozed watch is silenced in digest
    const digestWhileSnoozed = await client.getWatchDigest({
      simulated_time: '2026-10-20 10:20:00',
    });
    const foundSnoozed = digestWhileSnoozed.items.some(w => w.id === partWatch.id);
    assertTest(!foundSnoozed, "3.5 Snoozed watch is silenced and omitted from active digest");

    // Evaluate while snooze is active -> remains snoozed, does NOT re-trigger
    await client.evaluateWatches({
      simulated_time: '2026-10-20 10:30:00',
    });
    const stillSnoozed = await client.getWatch(partWatch.id);
    assertTest(stillSnoozed.state === 'snoozed', "3.6 Evaluation while snoozed keeps watch snoozed (silenced)");

    // Advance time past snooze (+75 minutes)
    await client.evaluateWatches({
      simulated_time: '2026-10-20 11:15:00',
    });
    const reTriggered = await client.getWatch(partWatch.id);
    assertTest(reTriggered.state === 'triggered', "3.7 Watch re-triggers once snooze expires");

    // Acknowledge watch
    const acked = await client.acknowledgeWatch(partWatch.id);
    assertTest(acked.state === 'acknowledged', "3.8 Watch state changed to 'acknowledged'");
    const digestPostAck = await client.getWatchDigest({
      simulated_time: '2026-10-20 11:20:00',
    });
    assertTest(!digestPostAck.items.some(w => w.id === partWatch.id), "3.9 Acknowledged watch removed from active digest");

    // 4. Acceptance Criterion 4: Quiet Hours Batching (22:00–07:00)
    console.log("\n--- 4. Acceptance Criterion 4: Quiet Hours Batching (22:00–07:00) ---");
    const noticeLate = await client.createNotice({
      ticket_id: ticket.id,
      unit_number: '202',
      tenant_name: 'Bob Miller',
      entry_start: '2026-10-23 21:00:00',
      entry_end: '2026-10-23 23:00:00',
      reason: 'Night valve check',
    });
    const nightWatch = await client.createWatch({
      watch_type: 'notice_deadline',
      target_type: 'notice',
      target_id: noticeLate.id,
      title: 'Late Night Notice Deadline Watch',
    });

    // Run evaluation at 23:00 (during quiet hours 22:00–07:00)
    const evalNight = await client.evaluateWatches({
      simulated_time: '2026-10-22 23:00:00',
    });
    const freshNight = await client.getWatch(nightWatch.id);
    assertTest(freshNight.state === 'triggered', "4.1 Watch triggers during late night evaluation (23:00)");
    assertTest(freshNight.quiet_hours_delayed === true, "4.2 Watch flagged with quiet_hours_delayed = true");

    // Digest at 23:00: quiet hours active -> places trigger in morning_batch
    const digestNight = await client.getWatchDigest({
      simulated_time: '2026-10-22 23:00:00',
    });
    assertTest(digestNight.is_quiet_hours === true, "4.3 Digest reports is_quiet_hours = true at 23:00");
    const inMorningBatch = digestNight.morning_batch?.some(w => w.id === nightWatch.id);
    assertTest(inMorningBatch, "4.4 Trigger firing at 23:00 is placed in morning_batch instead of immediate dispatch");

    // Digest next morning at 07:30: quiet hours passed -> surfaces in morning digest
    const digestMorning = await client.getWatchDigest({
      simulated_time: '2026-10-23 07:30:00',
    });
    assertTest(digestMorning.is_quiet_hours === false, "4.5 Quiet hours inactive at 07:30");
    const inMorningDigest = digestMorning.items?.some(w => w.id === nightWatch.id);
    assertTest(inMorningDigest, "4.6 Trigger firing at 23:00 waits and surfaces cleanly in morning digest");

    // 5. Delete and Cleanup
    console.log("\n--- 5. Cleanup & Delete ---");
    const delResult = await client.deleteWatch(nightWatch.id);
    assertTest(delResult?.deleted === true, "5.1 DELETE /api/watches/:id successfully removes watch");

  } finally {
    phpServer.kill();
  }

  console.log("\n========================================");
  console.log("Phase 6 E2E Summary:");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log("========================================\n");

  if (failures.length > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error("Unhandled error during Phase 6 E2E test:", err);
  process.exit(1);
});
