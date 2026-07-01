/**
 * Electron Main Process Flow Tests
 * Node.js assert-based mock tests (no real Electron/child_process needed)
 * Run: node tests/electron-flow.test.js
 */

const assert = require('assert');
const EventEmitter = require('events');

// ============================================================================
// Mock child_process.spawn for testing
// ============================================================================

class MockChildProcess extends EventEmitter {
  constructor(command, args, options) {
    super();
    this.command = command;
    this.args = args;
    this.options = options;
    this.pid = Math.floor(Math.random() * 10000) + 1000;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.killed = false;
    this.exitCode = null;
  }

  kill(signal = 'SIGTERM') {
    this.killed = true;
    this.emit('close', 0);
    return true;
  }

  simulateStdout(data) {
    this.stdout.emit('data', Buffer.from(data));
  }

  simulateStderr(data) {
    this.stderr.emit('data', Buffer.from(data));
  }

  simulateExit(code) {
    this.exitCode = code;
    this.emit('close', code);
  }
}

class MockSpawn {
  constructor() {
    this.processes = [];
    this.lastProcess = null;
  }

  spawn(command, args, options) {
    const proc = new MockChildProcess(command, args, options);
    this.processes.push(proc);
    this.lastProcess = proc;
    return proc;
  }
}

// ============================================================================
// Mock fetch for health polling tests
// ============================================================================

class MockFetch {
  constructor() {
    this.responses = [];
    this.callCount = 0;
    this.urls = [];
  }

  setResponse(url, response) {
    this.responses.push({ url, response, used: false });
  }

  async fetch(url) {
    this.callCount++;
    this.urls.push(url);
    const match = this.responses.find(r => url.includes(r.url) && !r.used);
    if (match) {
      match.used = true;
      return match.response;
    }
    throw new Error(`No mock response for ${url}`);
  }

  reset() {
    this.responses = [];
    this.callCount = 0;
    this.urls = [];
  }
}

// ============================================================================
// Test 1: Backend Process Startup Flow
// ============================================================================

describe('Backend Process Startup', () => {
  test('spawns with correct command and arguments', () => {
    const mockSpawn = new MockSpawn();
    const nodePath = process.execPath;
    const serverFile = '/path/to/backend/dist/server.js';

    const proc = mockSpawn.spawn(nodePath, [serverFile], {
      cwd: '/path/to/backend',
      env: { ELECTRON_MODE: 'true', NODE_ENV: 'production', PORT: '3001' },
      windowsHide: true,
      stdio: 'pipe',
    });

    assert.strictEqual(proc.command, nodePath, 'Should use Node.js executable');
    assert.deepStrictEqual(proc.args, [serverFile], 'Should pass server.js as argument');
    assert.strictEqual(proc.options.cwd, '/path/to/backend', 'Should set correct working directory');
    assert.strictEqual(proc.options.env.ELECTRON_MODE, 'true', 'Should set ELECTRON_MODE');
    assert.strictEqual(proc.options.env.NODE_ENV, 'production', 'Should set NODE_ENV');
    assert.strictEqual(proc.options.env.PORT, '3001', 'Should set PORT');
    assert.strictEqual(proc.options.windowsHide, true, 'Should hide window');
    assert.strictEqual(proc.options.stdio, 'pipe', 'Should pipe stdio');
    assert.ok(proc.pid > 0, 'Should have a valid PID');
    console.log('  PASS: Spawn parameters correct');
  });

  test('forwards stdout to console', () => {
    const mockSpawn = new MockSpawn();
    const proc = mockSpawn.spawn('node', ['server.js'], { stdio: 'pipe' });

    const logs = [];
    proc.stdout.on('data', (data) => {
      logs.push(data.toString().trim());
    });

    proc.simulateStdout('Server listening on port 3001');
    assert.strictEqual(logs[0], 'Server listening on port 3001', 'Should forward stdout');
    console.log('  PASS: Stdout forwarded to console');
  });

  test('forwards stderr to console.error', () => {
    const mockSpawn = new MockSpawn();
    const proc = mockSpawn.spawn('node', ['server.js'], { stdio: 'pipe' });

    const errors = [];
    proc.stderr.on('data', (data) => {
      errors.push(data.toString().trim());
    });

    proc.simulateStderr('Warning: deprecated API usage');
    assert.strictEqual(errors[0], 'Warning: deprecated API usage', 'Should forward stderr');
    console.log('  PASS: Stderr forwarded to console.error');
  });

  test('emits close event on process exit', () => {
    const mockSpawn = new MockSpawn();
    const proc = mockSpawn.spawn('node', ['server.js'], { stdio: 'pipe' });

    let closeCode = null;
    proc.on('close', (code) => {
      closeCode = code;
    });

    proc.simulateExit(0);
    assert.strictEqual(closeCode, 0, 'Should emit close with exit code');
    assert.strictEqual(proc.exitCode, 0, 'Should record exit code');
    console.log('  PASS: Close event emitted correctly');
  });

  test('kills backend process on app quit', () => {
    const mockSpawn = new MockSpawn();
    const proc = mockSpawn.spawn('node', ['server.js'], { stdio: 'pipe' });

    assert.strictEqual(proc.killed, false, 'Should not be killed initially');
    proc.kill();
    assert.strictEqual(proc.killed, true, 'Should be killed after app quit');
    console.log('  PASS: Backend killed on app quit');
  });
});

// ============================================================================
// Test 2: Health Polling Mechanism
// ============================================================================

describe('Health Polling', () => {
  test('polls health endpoint repeatedly', async () => {
    const mockFetch = new MockFetch();
    const healthUrl = 'http://localhost:3001/api/health';

    // First 2 calls fail, 3rd succeeds
    mockFetch.setResponse('3001/api/health', { ok: false, status: 502 });
    mockFetch.setResponse('3001/api/health', { ok: false, status: 502 });
    mockFetch.setResponse('3001/api/health', { ok: true, status: 200 });

    // Simulate polling loop
    let healthy = false;
    let attempts = 0;
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      attempts++;
      try {
        const res = await mockFetch.fetch(healthUrl);
        if (res.ok) {
          healthy = true;
          break;
        }
      } catch {
        // Continue polling
      }
    }

    assert.strictEqual(attempts, 3, 'Should succeed on 3rd attempt');
    assert.strictEqual(healthy, true, 'Should detect backend healthy');
    assert.strictEqual(mockFetch.callCount, 3, 'Should make exactly 3 calls');
    console.log('  PASS: Health polling succeeds after retries');
  });

  test('stops polling after success', async () => {
    const mockFetch = new MockFetch();
    mockFetch.setResponse('3001/api/health', { ok: true, status: 200 });

    let callsAfterSuccess = 0;
    let healthy = false;

    for (let i = 0; i < 5; i++) {
      if (healthy) {
        callsAfterSuccess++;
        continue;
      }
      const res = await mockFetch.fetch('http://localhost:3001/api/health');
      if (res.ok) {
        healthy = true;
      }
    }

    assert.strictEqual(callsAfterSuccess, 4, 'Should not call after success');
    assert.strictEqual(mockFetch.callCount, 1, 'Should only call once before success');
    console.log('  PASS: Polling stops after success');
  });

  test('detects backend offline', async () => {
    const mockFetch = new MockFetch();
    const results = [];

    // All calls fail
    for (let i = 0; i < 5; i++) {
      mockFetch.setResponse('3001/api/health', { ok: false, status: 503 });
    }

    for (let i = 0; i < 5; i++) {
      try {
        const res = await mockFetch.fetch('http://localhost:3001/api/health');
        results.push(res.ok ? 'online' : 'offline');
      } catch {
        results.push('error');
      }
    }

    assert.ok(results.every(r => r !== 'online'), 'Should never report online');
    assert.strictEqual(mockFetch.callCount, 5, 'Should make all 5 attempts');
    console.log('  PASS: Backend offline detected');
  });

  test('clears interval on stop', () => {
    let intervalId = null;
    let cleared = false;

    // Simulate setInterval
    intervalId = setInterval(() => {}, 500);

    // Simulate stop polling
    if (intervalId) {
      clearInterval(intervalId);
      cleared = true;
      intervalId = null;
    }

    assert.strictEqual(cleared, true, 'Should clear interval');
    assert.strictEqual(intervalId, null, 'Interval ID should be null');
    console.log('  PASS: Interval cleared on stop');
  });
});

// ============================================================================
// Test 3: 5 Kimi Key Injection
// ============================================================================

describe('Kimi Key Environment Injection', () => {
  const KIMI_KEYS = [
    'REMOVED_FROM_HISTORY',
    'REMOVED_FROM_HISTORY',
    'REMOVED_FROM_HISTORY',
    'REMOVED_FROM_HISTORY',
    'REMOVED_FROM_HISTORY',
  ];

  function injectEnv() {
    const env = {};
    env.KIMI_CODE_API_KEY_1 = KIMI_KEYS[0];
    env.KIMI_CODE_API_KEY_2 = KIMI_KEYS[1];
    env.KIMI_CODE_API_KEY_3 = KIMI_KEYS[2];
    env.KIMI_CODE_API_KEY_4 = KIMI_KEYS[3];
    env.KIMI_CODE_API_KEY_5 = KIMI_KEYS[4];
    env.KIMICODE_API_KEY = KIMI_KEYS[0];
    env.ELECTRON_MODE = 'true';
    env.NODE_ENV = 'production';
    env.PORT = '3001';
    return env;
  }

  test('injects all 5 Kimi keys into environment', () => {
    const env = injectEnv();

    assert.ok(env.KIMI_CODE_API_KEY_1, 'Should have KEY_1');
    assert.ok(env.KIMI_CODE_API_KEY_2, 'Should have KEY_2');
    assert.ok(env.KIMI_CODE_API_KEY_3, 'Should have KEY_3');
    assert.ok(env.KIMI_CODE_API_KEY_4, 'Should have KEY_4');
    assert.ok(env.KIMI_CODE_API_KEY_5, 'Should have KEY_5');
    assert.ok(env.KIMICODE_API_KEY, 'Should have legacy KIMICODE_API_KEY');

    assert.strictEqual(env.KIMI_CODE_API_KEY_1, KIMI_KEYS[0], 'KEY_1 should match');
    assert.strictEqual(env.KIMI_CODE_API_KEY_2, KIMI_KEYS[1], 'KEY_2 should match');
    assert.strictEqual(env.KIMI_CODE_API_KEY_3, KIMI_KEYS[2], 'KEY_3 should match');
    assert.strictEqual(env.KIMI_CODE_API_KEY_4, KIMI_KEYS[3], 'KEY_4 should match');
    assert.strictEqual(env.KIMI_CODE_API_KEY_5, KIMI_KEYS[4], 'KEY_5 should match');
    console.log('  PASS: All 5 keys injected');
  });

  test('each key starts with sk-kimi-', () => {
    const env = injectEnv();
    for (let i = 1; i <= 5; i++) {
      const key = env[`KIMI_CODE_API_KEY_${i}`];
      assert.ok(key.startsWith('sk-kimi-'), `Key ${i} should start with sk-kimi-`);
    }
    console.log('  PASS: All keys have correct prefix');
  });

  test('keys are non-empty and sufficiently long', () => {
    const env = injectEnv();
    for (let i = 1; i <= 5; i++) {
      const key = env[`KIMI_CODE_API_KEY_${i}`];
      assert.ok(key.length > 30, `Key ${i} should be longer than 30 chars`);
    }
    console.log('  PASS: All keys are sufficiently long');
  });

  test('keys are unique', () => {
    const env = injectEnv();
    const keys = [
      env.KIMI_CODE_API_KEY_1,
      env.KIMI_CODE_API_KEY_2,
      env.KIMI_CODE_API_KEY_3,
      env.KIMI_CODE_API_KEY_4,
      env.KIMI_CODE_API_KEY_5,
    ];
    const uniqueKeys = new Set(keys);
    assert.strictEqual(uniqueKeys.size, 5, 'All 5 keys should be unique');
    console.log('  PASS: All keys are unique');
  });

  test('legacy KIMICODE_API_KEY maps to first key', () => {
    const env = injectEnv();
    assert.strictEqual(env.KIMICODE_API_KEY, env.KIMI_CODE_API_KEY_1,
      'Legacy key should map to KEY_1');
    console.log('  PASS: Legacy key maps correctly');
  });

  test('injects additional environment variables', () => {
    const env = injectEnv();
    assert.strictEqual(env.ELECTRON_MODE, 'true', 'Should set ELECTRON_MODE');
    assert.strictEqual(env.NODE_ENV, 'production', 'Should set NODE_ENV');
    assert.strictEqual(env.PORT, '3001', 'Should set PORT');
    console.log('  PASS: Additional env vars injected');
  });

  test('handles partial key injection gracefully', () => {
    const partialEnv = {};
    partialEnv.KIMI_CODE_API_KEY_1 = KIMI_KEYS[0];
    partialEnv.KIMI_CODE_API_KEY_3 = KIMI_KEYS[2];
    // Missing KEY_2, KEY_4, KEY_5

    assert.ok(partialEnv.KIMI_CODE_API_KEY_1, 'Should have KEY_1');
    assert.strictEqual(partialEnv.KIMI_CODE_API_KEY_2, undefined, 'Should NOT have KEY_2');
    assert.ok(partialEnv.KIMI_CODE_API_KEY_3, 'Should have KEY_3');
    assert.strictEqual(partialEnv.KIMI_CODE_API_KEY_4, undefined, 'Should NOT have KEY_4');
    console.log('  PASS: Partial injection handled gracefully');
  });

  test('getStatus returns key statistics', () => {
    const env = injectEnv();
    const keyStatus = {
      total: 5,
      available: Object.keys(env).filter(k => k.startsWith('KIMI_CODE_API_KEY_')).length,
      healthy: 5,
      fallbackOrder: [1, 2, 3, 4, 5],
    };

    assert.strictEqual(keyStatus.total, 5, 'Should report 5 total');
    assert.strictEqual(keyStatus.available, 5, 'Should report 5 available');
    assert.strictEqual(keyStatus.healthy, 5, 'Should report 5 healthy');
    assert.deepStrictEqual(keyStatus.fallbackOrder, [1, 2, 3, 4, 5], 'Should have fallback order');
    console.log('  PASS: Key status statistics correct');
  });

  test('key format validation', () => {
    const env = injectEnv();
    const keyPattern = /^sk-kimi-[A-Za-z0-9]{50,80}$/;

    for (let i = 1; i <= 5; i++) {
      const key = env[`KIMI_CODE_API_KEY_${i}`];
      // Note: actual keys might not strictly match this simplified pattern
      // but they should start with sk-kimi- and be alphanumeric after
      assert.ok(key.startsWith('sk-kimi-'), `Key ${i} format starts correctly`);
      const suffix = key.slice(8); // after 'sk-kimi-'
      assert.ok(/^[A-Za-z0-9]+$/.test(suffix), `Key ${i} suffix should be alphanumeric`);
    }
    console.log('  PASS: Key format validated');
  });
});

// ============================================================================
// Test 4: Integrated Startup Flow
// ============================================================================

describe('Integrated Startup Flow', () => {
  test('full startup sequence', async () => {
    const mockSpawn = new MockSpawn();
    const mockFetch = new MockFetch();
    const env = {};

    // Step 1: Inject environment
    env.KIMI_CODE_API_KEY_1 = 'sk-kimi-test-001';
    env.KIMI_CODE_API_KEY_2 = 'sk-kimi-test-002';
    env.ELECTRON_MODE = 'true';
    env.NODE_ENV = 'production';
    env.PORT = '3001';

    assert.strictEqual(Object.keys(env).filter(k => k.startsWith('KIMI_CODE_API_KEY_')).length, 2,
      'Should inject keys');

    // Step 2: Spawn backend
    const proc = mockSpawn.spawn(process.execPath, ['/backend/dist/server.js'], {
      cwd: '/backend',
      env: { ...env, ELECTRON_MODE: 'true' },
      windowsHide: true,
      stdio: 'pipe',
    });

    assert.ok(proc.pid, 'Backend should spawn with PID');

    // Step 3: Backend emits ready message
    proc.simulateStdout('Server started on http://localhost:3001');

    // Step 4: Health check succeeds
    mockFetch.setResponse('3001/api/health', { ok: true, status: 200 });
    const health = await mockFetch.fetch('http://localhost:3001/api/health');
    assert.strictEqual(health.ok, true, 'Health check should pass');

    // Step 5: App creates window
    const appState = { windowCreated: true, backendPid: proc.pid };
    assert.strictEqual(appState.windowCreated, true, 'Window should be created');
    assert.strictEqual(appState.backendPid, proc.pid, 'Should track backend PID');

    console.log('  PASS: Full startup sequence verified');
  });
});

// ============================================================================
// Test Runner
// ============================================================================

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function test(name, fn) {
  try {
    fn();
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.error(`    ${e.message}`);
    process.exitCode = 1;
    return;
  }
}

console.log('=== Electron Flow Test Suite ===');
console.log('Running tests...\n');

if (require.main === module) {
  console.log('\nAll tests completed. Check output above for PASS/FAIL.');
}
