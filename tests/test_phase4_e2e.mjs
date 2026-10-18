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
  console.log("=== Running Phase 4 Parts Catalog, Stockpiles & Shopping Lists E2E Tests ===\n");

  const port = 8893;
  const phpServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'public']);
  
  // Wait 450ms for PHP server to start
  await new Promise(r => setTimeout(r, 450));

  try {
    const client = new ApiClient(`http://127.0.0.1:${port}`);
    client.setToken('test-tech-token');

    // 0. Health check
    const health = await client.health();
    assertTest(health?.status === 'ok', "0.1 Slim server /api/health is live");

    // 1. Seed base data via endpoints
    console.log("\n--- 1. Seed Stockpiles & Suppliers via API ---");
    const sp1 = await client.createStockpile({
      name: '511 Days Rd Storage',
      location: '511 Days Rd',
      notes: 'Main distribution hub',
    });
    assertTest(sp1?.id > 0, "1.1 Stockpile '511 Days Rd Storage' created via POST /api/stockpiles");

    const sp2 = await client.createStockpile({
      name: '1719 Bath Donors',
      location: '1719 Bath Rd',
      notes: 'Donor equipment depot',
    });
    assertTest(sp2?.id > 0, "1.2 Stockpile '1719 Bath Donors' created via POST /api/stockpiles");

    const supplier = await client.createSupplier({
      name: 'Dependable Appliances',
      contact_name: 'Parts Desk',
      phone: '613-542-8822',
      hours: 'Mon–Fri 8:30–5',
      address: 'Kingston, ON',
    });
    assertTest(supplier?.phone === '613-542-8822', "1.3 Supplier created with phone 613-542-8822");
    assertTest(supplier?.hours === 'Mon–Fri 8:30–5', "1.4 Supplier created with hours 'Mon–Fri 8:30–5'");

    // Seed Robertshaw switch: WB24T10025
    const switchPart = await client.createPart({
      name: 'Robertshaw Infinite Switch',
      part_number: 'WB24T10025',
      category: 'Electric Range',
      description: 'Surface element infinite rotary switch 240V',
      quantity_on_hand: 2,
      min_quantity: 2,
      reorder_point: 2,
      unit_cost: 42.50,
      compatible_models: ['GE JBP24', 'Hotpoint RB525', 'Kenmore 911'],
      price_history: [
        { date: '2026-01-15', price: 39.50, supplier: 'Dependable Appliances' },
        { date: '2026-02-10', price: 42.50, supplier: 'Dependable Appliances' }
      ],
      stockpile_id: sp1.id,
      preferred_supplier_id: supplier.id,
    });
    assertTest(switchPart?.id > 0, "1.5 Part WB24T10025 created via POST /api/parts");

    // 2. Acceptance Criterion 1: Search "WB24T10025"
    console.log("\n--- 2. Acceptance Criterion 1: Search 'WB24T10025' ---");
    const searchResults = await client.getParts('WB24T10025');
    assertTest(Array.isArray(searchResults) && searchResults.length >= 1, "2.1 GET /api/parts?q=WB24T10025 returned matching part");
    
    const part = searchResults.find(p => p.part_number === 'WB24T10025') || searchResults[0];
    assertTest(part.part_number === 'WB24T10025', "2.2 Found part has part_number 'WB24T10025'");
    assertTest(Array.isArray(part.compatible_models) && part.compatible_models.length >= 3, "2.3 Compatible models listed as array");
    assertTest(part.compatible_models.includes('GE JBP24'), "2.4 Compatible models include 'GE JBP24'");
    assertTest(part.quantity_on_hand === 2, "2.5 Stock shows 2 available in stock");
    assertTest(part.stock_summary?.includes('511 Days Rd') || part.stockpiles?.some(s => s.stockpile_location?.includes('511 Days Rd')), "2.6 Stock shows location '511 Days Rd'");
    assertTest(Array.isArray(part.price_history) && part.price_history.length >= 2, "2.7 Order/price history present");

    // 3. Acceptance Criterion 2: Build Shopping List from 3 Open Tickets (Harvest-First)
    console.log("\n--- 3. Acceptance Criterion 2: Harvest-First Shopping List from 3 Tickets ---");
    const t1 = await client.createTicket({
      wo_number: 'WO-E2E-SW1',
      title: 'Stove burner infinite switch clicking',
      description: 'Need Robertshaw switch WB24T10025',
      verified_scope: 'Replace switch WB24T10025',
      building_id: 1,
      priority: 'medium',
    });
    const t2 = await client.createTicket({
      wo_number: 'WO-E2E-SW2',
      title: 'Burner stays on max heat',
      description: 'Switch contacts frozen WB24T10025',
      verified_scope: 'Install replacement WB24T10025',
      building_id: 2,
      priority: 'high',
    });
    const t3 = await client.createTicket({
      wo_number: 'WO-E2E-SW3',
      title: 'Front element open circuit',
      description: 'Burner control switch WB24T10025',
      verified_scope: 'Swap switch WB24T10025',
      building_id: 1,
      priority: 'medium',
    });

    const shoppingList = await client.buildShoppingList([t1.id, t2.id, t3.id]);
    assertTest(shoppingList?.total_parts_count === 1, "3.1 Deduped 3 tickets into exactly 1 line item");
    assertTest(shoppingList?.total_items_needed === 3, "3.2 Total items needed is 3");

    const line = shoppingList.items[0];
    assertTest(line.part_number === 'WB24T10025', "3.3 Line item part number is 'WB24T10025'");
    assertTest(line.available_in_stock >= 2, "3.4 Correctly identified available stock in stockpile");
    assertTest(line.harvest_quantity === 2, "3.5 Harvest quantity allocated as 2");
    assertTest(line.buy_quantity === 1, "3.6 Buy quantity allocated as 1");
    assertTest(line.harvest_tag?.includes('harvest first @ 511 Days Rd'), "3.7 Tagged with 'harvest first @ 511 Days Rd'");
    assertTest(line.buy_tag?.includes('buy @ Dependable Appliances'), "3.8 Unfulfilled amount tagged with 'buy @ Dependable Appliances'");

    // 4. Acceptance Criterion 3: Log Part Use, Decrement Stock & Reorder Flag
    console.log("\n--- 4. Acceptance Criterion 3: Log Part Use & Dynamic Reorder Flag ---");
    const job = await client.createJob({
      title: 'Range repair session',
      ticket_id: t1.id,
      building_id: 1,
      estimated_minutes: 30,
    });

    const useResult = await client.usePart(switchPart.id, {
      quantity: 1,
      job_id: job.id,
      stockpile_id: sp1.id,
      reason: 'Replaced broken switch on range in unit 174',
    });

    assertTest(useResult?.previous_quantity === 2, "4.1 Previous stock was 2");
    assertTest(useResult?.new_quantity === 1, "4.2 Stock decremented from 2 to 1");
    assertTest(useResult?.quantity_used === 1, "4.3 Quantity used logged as 1");
    assertTest(useResult?.is_reorder === true, "4.4 Dropping to/below reorder point (1 <= 2) raises is_reorder flag");
    assertTest(Boolean(useResult?.reorder_warning), "4.5 Reorder warning returned in payload");

    // Verify part record reflects new stock & reorder status on subsequent GET
    const refreshedPart = await client.getPart(switchPart.id);
    assertTest(refreshedPart.quantity_on_hand === 1, "4.6 GET /api/parts/:id verifies new quantity_on_hand = 1");
    assertTest(refreshedPart.is_reorder === true, "4.7 GET /api/parts/:id verifies is_reorder = true");

    // 5. Acceptance Criterion 4: Supplier Records with Phone & Hours
    console.log("\n--- 5. Acceptance Criterion 4: Supplier Record with Phone & Hours ---");
    const suppliers = await client.getSuppliers();
    assertTest(Array.isArray(suppliers) && suppliers.length >= 1, "5.1 GET /api/suppliers returned supplier directory");
    const dependable = suppliers.find(s => s.name === 'Dependable Appliances') || suppliers[0];
    assertTest(dependable.phone === '613-542-8822', "5.2 Supplier record phone is '613-542-8822'");
    assertTest(dependable.hours === 'Mon–Fri 8:30–5', "5.3 Supplier record hours are 'Mon–Fri 8:30–5'");

    console.log("\n========================================");
    console.log(`Phase 4 E2E Summary:`);
    console.log(`Passes: ${passes.length}`);
    console.log(`Failures: ${failures.length}`);
    console.log("========================================");

    if (failures.length > 0) {
      process.exit(1);
    }
  } finally {
    phpServer.kill();
  }
}

runE2E().catch(err => {
  console.error("Fatal error in Phase 4 E2E test:", err);
  process.exit(1);
});
