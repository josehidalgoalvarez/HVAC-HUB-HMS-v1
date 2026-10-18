import { spawn } from 'child_process';
import { ApiClient, AuthError, ApiError } from '../src/api/client.ts';

// Mock minimal sessionStorage for Node environment
global.window = {
  sessionStorage: {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  }
};

async function runTests() {
  console.log("=== Testing ApiClient against Slim 4 API ===");
  
  // Start PHP server on 127.0.0.1:8899
  const phpServer = spawn('php', ['-S', '127.0.0.1:8899', '-t', 'public']);
  
  // Wait 400ms for server to boot
  await new Promise(r => setTimeout(r, 400));
  
  try {
    const client = new ApiClient('http://127.0.0.1:8899');
    
    // 1. Test health()
    const health = await client.health();
    console.log("1. client.health():", health);
    if (!health || health.status !== 'ok') {
      throw new Error(`Expected health status 'ok', got: ${JSON.stringify(health)}`);
    }
    console.log("[PASS] client.health() returned { status: 'ok' }");
    
    // 2. Test 401 throws AuthError
    let threwAuthError = false;
    try {
      await client.get('/api/protected');
    } catch (err) {
      if (err instanceof AuthError) {
        threwAuthError = true;
        console.log(`[PASS] Correctly threw AuthError on 401 (code: ${err.code}, status: ${err.status}, message: ${err.message})`);
      } else {
        console.error("Threw unexpected error type:", err);
      }
    }
    if (!threwAuthError) {
      throw new Error("Failed to throw AuthError on 401 response");
    }
    
    // 3. Test authenticated request with token
    client.setToken('test-tech-token');
    const protectedData = await client.get('/api/protected');
    console.log("3. Protected data with token:", protectedData);
    if (!protectedData || protectedData.user?.role !== 'tech') {
      throw new Error(`Unexpected protected data: ${JSON.stringify(protectedData)}`);
    }
    console.log("[PASS] Authenticated request succeeded with Bearer token");
    
    // 4. Test isOnline()
    const online = await client.isOnline();
    if (!online) {
      throw new Error("Expected isOnline() to return true");
    }
    console.log("[PASS] client.isOnline() returned true");
    
    console.log("\nALL API CLIENT TESTS PASSED!");
  } finally {
    phpServer.kill();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
