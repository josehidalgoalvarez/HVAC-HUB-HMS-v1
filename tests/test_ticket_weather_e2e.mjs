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

async function runWeatherWatchE2E() {
  console.log("=== Running Batch B: Ticket Exterior Work & Manual Weather Watch E2E Tests ===\n");

  const port = 8912;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);

  // Wait 450ms for server to spin up
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 1. Create ticket without exterior work initially
    console.log("--- 1. Create Ticket ---");
    const ticket = await client.createTicket({
      building_id: 1,
      title: 'Rooftop Make-Up Air Unit Filter Replacement',
      priority: 'high',
      verified_scope: 'Rooftop unit servicing',
    });

    assertTest(ticket && ticket.id, "1.1 Ticket created with ID " + ticket.id);
    assertTest(ticket.exterior_work === false, "1.2 Initial exterior_work is false");
    assertTest(ticket.weather_note === null, "1.3 Initial weather_note is null");

    // 2. Toggle Exterior Work ON & Write Outlook Note
    console.log("\n--- 2. Toggle Exterior Work ON & Save Outlook Note ---");
    const updatedTicket = await client.updateTicket(ticket.id, {
      exterior_work: true,
      weather_note: 'might rain Wed–Thu; ideal: Mon–Tue',
      reason: 'Flagged as exterior job with rain planning note',
    });

    assertTest(updatedTicket.exterior_work === true, "2.1 Ticket exterior_work is true");
    assertTest(updatedTicket.weather_note === 'might rain Wed–Thu; ideal: Mon–Tue', "2.2 weather_note saved on ticket");

    // Create manual weather watch linked to ticket
    const watch = await client.createWatch({
      watch_type: 'weather_manual',
      title: `Weather: ${updatedTicket.building_name || '100 Days Rd'} (WO: #${ticket.id})`,
      description: updatedTicket.weather_note,
      target_type: 'ticket',
      target_id: Number(ticket.id),
      state: 'triggered',
      config: {
        ticket_id: Number(ticket.id),
        wo_number: updatedTicket.wo_number,
        building_name: updatedTicket.building_name,
        weather_note: updatedTicket.weather_note,
      },
    });

    assertTest(watch && watch.id, "2.3 weather_manual watch created with ID " + watch.id);
    assertTest(watch.watch_type === 'weather_manual', "2.4 Watch type is weather_manual");
    assertTest(watch.target_type === 'ticket', "2.5 Target type is ticket");
    assertTest(watch.target_id === Number(ticket.id), "2.6 Target ID matches ticket ID");
    assertTest(watch.state === 'triggered', "2.7 Watch state is triggered (active alert)");

    // 3. Verify Watch appears in Watches query and Daily Digest
    console.log("\n--- 3. Verify Watch in Watches section & Daily Digest ---");
    const ticketWatches = await client.getWatches({ target_type: 'ticket', target_id: ticket.id });
    const foundWatch = ticketWatches.find(w => Number(w.id) === Number(watch.id));
    assertTest(!!foundWatch, "3.1 Watch card found in ticket watches list");
    assertTest(foundWatch?.watch_type === 'weather_manual', "3.2 Watch card type is weather_manual");

    const digest = await client.getWatchDigest();
    const inDigest = digest.items.some(w => Number(w.id) === Number(watch.id));
    assertTest(inDigest, "3.3 Watch appears in Today's Digest alert items");

    // 4. Edit Outlook Note
    console.log("\n--- 4. Edit Outlook Note ---");
    const newNote = 'ideal: Mon–Tue confirmed';
    const editedTicket = await client.updateTicket(ticket.id, {
      weather_note: newNote,
      reason: 'Updated outlook after checking morning radar',
    });
    assertTest(editedTicket.weather_note === newNote, "4.1 Ticket weather_note updated");

    const editedWatch = await client.updateWatch(watch.id, {
      description: newNote,
      latest_trigger_reason: `Exterior work outlook: ${newNote}`,
      config: {
        ...watch.config,
        weather_note: newNote,
      },
      reason: 'Updated weather outlook note',
    });
    assertTest(editedWatch.description === newNote, "4.2 Watch description updated to new note");

    // 5. Toggle Off / Clear Note -> Watch Dismissed
    console.log("\n--- 5. Toggle Off or Clear Note -> Watch Dismissed ---");
    const resolvedWatch = await client.resolveWatch(watch.id);
    assertTest(resolvedWatch.state === 'resolved', "5.1 Watch state updated to 'resolved' (dismissed)");

    const clearedTicket = await client.updateTicket(ticket.id, {
      exterior_work: false,
      weather_note: null,
      reason: 'Exterior work toggled off, note cleared',
    });
    assertTest(clearedTicket.exterior_work === false, "5.2 Ticket exterior_work toggled off");
    assertTest(clearedTicket.weather_note === null, "5.3 Ticket weather_note cleared to null");

    // Verify dismissed watch is no longer in active digest
    const freshDigest = await client.getWatchDigest();
    const stillInDigest = freshDigest.items.some(w => Number(w.id) === Number(watch.id));
    assertTest(!stillInDigest, "5.4 Dismissed watch is removed from active digest");

    // 6. Freeze Watch Untouched
    console.log("\n--- 6. Freeze Watch Untouched ---");
    const freezeWatch = await client.createWatch({
      watch_type: 'weather_freeze',
      title: 'Automated Regional Freeze Watch',
      config: { threshold_temp_c: 0.0 },
    });
    assertTest(freezeWatch.watch_type === 'weather_freeze', "6.1 weather_freeze watch created independently");
    assertTest(freezeWatch.target_type === 'weather', "6.2 weather_freeze target_type remains weather");

    // Clean up freeze watch
    await client.deleteWatch(freezeWatch.id);

    console.log("\n============================================");
    console.log(`Results: ${passes.length} passed, ${failures.length} failed`);
    console.log("============================================");

  } finally {
    phpServer.kill();
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

runWeatherWatchE2E().catch(err => {
  console.error("Fatal E2E test error:", err);
  process.exit(1);
});
