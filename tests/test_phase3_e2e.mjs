import { spawn } from 'child_process';
import { ApiClient } from '../src/api/client.ts';
import { outbox } from '../src/offline/outbox.ts';

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
  // If global.navigator does not exist, define it
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
  console.log("=== Running Phase 3 Field Logging & Job Close-Out E2E Tests ===\n");

  const port = 8896;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);
  
  // Wait 450ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 0. Health check
    const health = await client.health();
    assertTest(health.status === 'ok', "0.1 Slim server /api/health is live");

    // 1. Setup ticket & run sheet block
    console.log("\n--- 1. Pre-filled Context Setup (Ticket + Run Sheet Block) ---");
    const ticket = await client.createTicket({
      wo_number: 'WO-FIELD-900',
      title: 'Water Heater Element Burnout',
      building_id: 1,
      unit_id: 326,
      priority: 'urgent',
      status: 'verified',
      verified_scope: 'Lower 4500W element shorted to ground, trip breaker',
    });
    assertTest(ticket && ticket.id, "1.1 Ticket created with ID " + ticket.id);

    const runSheet = await client.createRunSheet({
      title: 'Field Logging Day Plan',
      scheduled_date: '2026-10-21',
    });
    const block = await client.addRunSheetBlock(runSheet.id, {
      ticket_id: ticket.id,
      building_id: 1,
      unit_id: 326,
      title: ticket.title,
      estimated_minutes: 45,
    });
    assertTest(block && block.id, "1.2 Run sheet block created with ID " + block.id);

    // 2. Field Job Creation with Pre-filled Context
    console.log("\n--- 2. Field Job Creation & Quick Logging ---");
    const startTime = new Date().toISOString();
    const job = await client.createJob({
      ticket_id: ticket.id,
      run_sheet_block_id: block.id,
      building_id: 1,
      unit_id: 1,
      title: ticket.title,
      estimated_minutes: 45,
      start_time: startTime,
    });
    assertTest(job && job.id, "2.1 Field job created with ID " + job.id);
    assertTest(job.status === 'in_progress', "2.2 Field job status is 'in_progress'");

    // Verify linked ticket auto-advanced to in-progress
    const currentTicket = await client.getTicket(ticket.id);
    assertTest(currentTicket.status === 'in-progress', "2.3 Linked ticket automatically moved to 'in-progress'");

    // Add note
    const note = await client.addJobNote(job.id, 'Diagnostic: Lower 4500W heating element reads 0 ohms resistance.');
    assertTest(note && note.id, "2.4 Field note logged via POST /api/jobs/:id/notes");

    // Add part used
    const part = await client.addJobPartUsed(job.id, {
      part_name: 'Screw-in Heating Element 4500W 240V',
      quantity: 1,
      unit: 'pcs',
      notes: 'OEM replacement installed with new rubber gasket',
    });
    assertTest(part && part.id, "2.5 Part used logged via POST /api/jobs/:id/parts-used");

    // Attach photo
    const photo = await client.addJobPhoto(job.id, {
      file_path: '/uploads/element_installed.jpg',
      caption: 'New element seated and torqued to 35 ft-lbs',
    });
    assertTest(photo && photo.id, "2.6 Photo attached via POST /api/jobs/:id/photos");

    // 3. Job Close-Out & State Progression (Acceptance Criterion 2)
    console.log("\n--- 3. Job Close-Out & Ticket State Progression (Acceptance Criterion 2) ---");
    const closedJob = await client.closeJob(job.id, {
      actual_minutes: 50,
      notes: 'Filled tank, purged air from hot faucets, energized breaker. 18.8A draw confirmed.',
      parts_used: [
        { part_name: 'Water Heater Drain Hose Adapter', quantity: 1, unit: 'pcs' },
      ],
    });

    assertTest(closedJob.status === 'completed', "3.1 Job status changed to 'completed'");
    assertTest(closedJob.actual_minutes === 50, "3.2 Actual minutes recorded as 50m (vs 45m est)");
    assertTest(closedJob.variance_minutes === 5, "3.3 Variance minutes recorded as +5m");

    // Acceptance: linked ticket moves to 'done'
    const finalTicket = await client.getTicket(ticket.id);
    assertTest(finalTicket.status === 'done', "3.4 Linked ticket moved to 'done'");

    // Acceptance: correction rows written for the state change
    const corrections = await client.getTicketCorrections(ticket.id);
    assertTest(corrections && corrections.length >= 2, "3.5 Append-only correction rows written for ticket state changes");
    const doneCorrection = corrections.find(c => ((c.fieldName || c.field_name) === 'status') && ((c.newValue || c.new_value) === 'done'));
    assertTest(Boolean(doneCorrection), "3.6 Correction record explicitly documents new_value = 'done'");

    // Linked run sheet block completed
    const updatedRunSheet = await client.getRunSheet(runSheet.id);
    const updatedBlock = updatedRunSheet.blocks.find(b => b.id === block.id);
    assertTest(updatedBlock && updatedBlock.status === 'completed', "3.7 Linked run sheet block updated to 'completed'");
    assertTest(updatedBlock && updatedBlock.actual_minutes === 50, "3.8 Linked run sheet block recorded actual minutes (50m)");

    // 4. Offline Outbox & Reconnect Sync (Acceptance Criterion 1)
    console.log("\n--- 4. Offline Outbox & Reconnect Sync (Acceptance Criterion 1) ---");
    
    // Create second job for offline test
    const jobOffline = await client.createJob({
      title: 'Basement AC Airflow Check',
      building_id: 1,
      estimated_minutes: 30,
    });

    // Clear outbox before test
    await outbox.clear();
    let pendingCount = await outbox.getPendingCount();
    assertTest(pendingCount === 0, "4.1 Outbox is empty before simulation");

    // KILL THE NETWORK (simulate offline)
    global.navigator.onLine = false;

    // Log 3 items offline: (1) note, (2) photo, (3) part used
    await outbox.enqueue({
      type: 'add_note',
      endpoint: `/api/jobs/${jobOffline.id}/notes`,
      method: 'POST',
      job_id: jobOffline.id,
      payload: { job_id: jobOffline.id, note_text: 'Static pressure measured at 0.45 in WC. Filter clean.' },
      idempotency_key: 'offline_action_1',
    });

    await outbox.enqueue({
      type: 'add_photo',
      endpoint: `/api/jobs/${jobOffline.id}/photos`,
      method: 'POST',
      job_id: jobOffline.id,
      payload: { job_id: jobOffline.id, file_path: '/uploads/manometer_reading.jpg', caption: 'Manometer reading 0.45' },
      idempotency_key: 'offline_action_2',
    });

    await outbox.enqueue({
      type: 'add_part_used',
      endpoint: `/api/jobs/${jobOffline.id}/parts-used`,
      method: 'POST',
      job_id: jobOffline.id,
      payload: { job_id: jobOffline.id, part_name: 'Merv 11 Filter 20x25x4', quantity: 1, unit: 'pcs' },
      idempotency_key: 'offline_action_3',
    });

    // Check outbox shows "3 unsynced changes"
    pendingCount = await outbox.getPendingCount();
    assertTest(pendingCount === 3, "4.2 Kill network -> outbox shows exactly '3 unsynced changes'");

    // RESTORE THE NETWORK
    global.navigator.onLine = true;

    // Trigger sync
    const syncResult = await outbox.sync(client);
    assertTest(syncResult.synced === 3, "4.3 Restore network -> all 3 offline mutations synced in order");
    assertTest(syncResult.failed === 0, "4.4 Zero failures during sync");

    // Outbox is now empty (no duplicate requests)
    pendingCount = await outbox.getPendingCount();
    assertTest(pendingCount === 0, "4.5 Outbox cleared -> 0 unsynced changes remaining, no duplicates");

    // Verify backend received all 3 items
    const verifiedJob = await client.getJob(jobOffline.id);
    assertTest(verifiedJob.notes_list.length === 1, "4.6 Offline note persisted on backend");
    assertTest(verifiedJob.photos.length === 1, "4.7 Offline photo persisted on backend");
    assertTest(verifiedJob.parts_used.length === 1, "4.8 Offline part used persisted on backend");

  } catch (err) {
    console.error("Test execution threw error:", err);
    failures.push("E2E exception: " + err.message);
  } finally {
    phpServer.kill();
  }

  console.log("\n========================================");
  console.log("Phase 3 E2E Summary:");
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
