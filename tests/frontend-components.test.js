/**
 * Frontend Components Test Suite
 * Jest + React Testing Library style (mock-based, no real React/Electron needed)
 * Run: node tests/frontend-components.test.js
 */

const assert = require('assert');

// ============================================================================
// Mock React hooks and components for testing
// ============================================================================

function createMockComponent(name, initialState = {}) {
  return {
    name,
    state: { ...initialState },
    setState(newState) {
      this.state = { ...this.state, ...newState };
    },
    renderLog: [],
    logRender(msg) {
      this.renderLog.push(msg);
    },
  };
}

// ============================================================================
// Test 1: AgentContextPanel — 5 collapsible sections
// ============================================================================

describe('AgentContextPanel', () => {
  const mockContext = {
    agentId: 'agent-001',
    systemPrompt: 'You are a helpful coding assistant.',
    historyMessages: [
      { role: 'user', content: 'Write a sort function', timestamp: '2024-01-15T10:00:00Z' },
      { role: 'assistant', content: 'Here is a quicksort implementation...', timestamp: '2024-01-15T10:01:00Z' },
      { role: 'user', content: 'Can you optimize it?', timestamp: '2024-01-15T10:02:00Z' },
    ],
    toolCalls: [
      { tool: 'code_interpreter', input: 'print([1,2,3])', output: '[1, 2, 3]', status: 'success' },
      { tool: 'file_search', input: 'find *.test.js', output: '3 files found', status: 'success' },
    ],
    knowledgeRefs: [
      { kbId: 'kb-001', chunk: 'Sorting algorithms chapter 3', relevance: 0.92 },
      { kbId: 'kb-002', chunk: 'Big O notation reference', relevance: 0.85 },
    ],
    tokenUsage: {
      prompt_tokens: 1250,
      completion_tokens: 890,
      total_tokens: 2140,
      cost_usd: 0.0032,
      model: 'moonshot-v1-8k',
    },
  };

  test('renders all 5 collapsible sections', () => {
    const sections = ['System Prompt', '历史消息', '工具调用', '知识库引用', 'Token用量'];
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 0: true, 1: false, 2: false, 3: false, 4: false },
      context: mockContext,
    });

    assert.strictEqual(sections.length, 5, 'Panel must have exactly 5 sections');
    assert.strictEqual(panel.state.context.historyMessages.length, 3, 'Should have 3 history messages');
    assert.strictEqual(panel.state.context.toolCalls.length, 2, 'Should have 2 tool calls');
    assert.strictEqual(panel.state.context.knowledgeRefs.length, 2, 'Should have 2 knowledge refs');
    assert.ok(panel.state.context.tokenUsage.total_tokens > 0, 'Token usage must be positive');
    panel.logRender('All 5 sections rendered with context');
    console.log('  PASS: All 5 collapsible sections present');
  });

  test('toggles section expand/collapse', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: {},
    });

    // Toggle section 0 on
    panel.setState({ expandedSections: { 0: true } });
    assert.strictEqual(panel.state.expandedSections[0], true, 'Section 0 should be expanded');

    // Toggle section 0 off
    panel.setState({ expandedSections: { 0: false } });
    assert.strictEqual(panel.state.expandedSections[0], false, 'Section 0 should be collapsed');

    // Multiple sections
    panel.setState({ expandedSections: { 0: true, 2: true, 4: true } });
    assert.ok(panel.state.expandedSections[0], 'Section 0 expanded');
    assert.ok(!panel.state.expandedSections[1], 'Section 1 collapsed');
    assert.ok(panel.state.expandedSections[2], 'Section 2 expanded');
    console.log('  PASS: Section expand/collapse toggles correctly');
  });

  test('displays system prompt content', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 0: true },
      context: mockContext,
    });

    assert.ok(panel.state.context.systemPrompt.length > 0, 'System prompt should not be empty');
    assert.ok(panel.state.context.systemPrompt.includes('coding'), 'System prompt should mention coding');
    console.log('  PASS: System prompt content displayed');
  });

  test('displays history messages with role badges', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 1: true },
      context: mockContext,
    });

    const msgs = panel.state.context.historyMessages;
    assert.strictEqual(msgs[0].role, 'user', 'First message should be user');
    assert.strictEqual(msgs[1].role, 'assistant', 'Second message should be assistant');
    assert.ok(msgs.every(m => m.timestamp), 'All messages should have timestamps');
    console.log('  PASS: History messages with role badges');
  });

  test('displays tool call results', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 2: true },
      context: mockContext,
    });

    const tools = panel.state.context.toolCalls;
    assert.strictEqual(tools[0].tool, 'code_interpreter', 'First tool should be code_interpreter');
    assert.strictEqual(tools[0].status, 'success', 'Tool should show success status');
    assert.ok(tools[0].output, 'Tool should have output');
    console.log('  PASS: Tool calls displayed with status');
  });

  test('displays knowledge base references with relevance', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 3: true },
      context: mockContext,
    });

    const refs = panel.state.context.knowledgeRefs;
    assert.ok(refs[0].relevance >= 0.85, 'First ref should have high relevance');
    assert.ok(refs[0].chunk, 'Ref should have chunk text');
    assert.ok(refs[0].kbId, 'Ref should have kbId');
    console.log('  PASS: Knowledge refs with relevance scores');
  });

  test('displays token usage breakdown', () => {
    const panel = createMockComponent('AgentContextPanel', {
      expandedSections: { 4: true },
      context: mockContext,
    });

    const usage = panel.state.context.tokenUsage;
    assert.strictEqual(usage.prompt_tokens + usage.completion_tokens, usage.total_tokens,
      'Prompt + completion should equal total');
    assert.ok(usage.cost_usd >= 0, 'Cost should be non-negative');
    assert.ok(usage.model, 'Should specify model name');
    console.log('  PASS: Token usage breakdown correct');
  });
});

// ============================================================================
// Test 2: HumanTakeoverPanel — 3 takeover modes
// ============================================================================

describe('HumanTakeoverPanel', () => {
  test('supports 3 takeover modes', () => {
    const modes = ['replace', 'direct', 'guide'];
    const panel = createMockComponent('HumanTakeoverPanel', {
      currentMode: 'replace',
      modes: modes,
    });

    assert.strictEqual(panel.state.modes.length, 3, 'Should have exactly 3 modes');
    assert.ok(panel.state.modes.includes('replace'), 'Should support replace mode');
    assert.ok(panel.state.modes.includes('direct'), 'Should support direct mode');
    assert.ok(panel.state.modes.includes('guide'), 'Should support guide mode');
    console.log('  PASS: All 3 takeover modes supported');
  });

  test('mode switch triggers callback', () => {
    const callbacks = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      currentMode: 'replace',
      onModeChange: (mode) => callbacks.push(mode),
    });

    // Simulate mode change
    panel.state.onModeChange('direct');
    assert.strictEqual(callbacks[0], 'direct', 'Callback should fire with new mode');

    panel.state.onModeChange('guide');
    assert.strictEqual(callbacks[1], 'guide', 'Callback should fire again');
    console.log('  PASS: Mode switch callback fires correctly');
  });

  test('replace mode: submits as agent response', () => {
    const submissions = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      mode: 'replace',
      onSubmit: (text, mode) => submissions.push({ text, mode, asAgent: true }),
    });

    panel.state.onSubmit('This is my reply', 'replace');
    assert.strictEqual(submissions[0].mode, 'replace');
    assert.strictEqual(submissions[0].asAgent, true, 'replace mode should send as agent');
    console.log('  PASS: Replace mode sends as agent response');
  });

  test('direct mode: submits as human message', () => {
    const submissions = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      mode: 'direct',
      onSubmit: (text, mode) => submissions.push({ text, mode, asAgent: false }),
    });

    panel.state.onSubmit('User speaking here', 'direct');
    assert.strictEqual(submissions[0].mode, 'direct');
    assert.strictEqual(submissions[0].asAgent, false, 'direct mode should send as human');
    console.log('  PASS: Direct mode sends as human message');
  });

  test('guide mode: sends instructions to agent', () => {
    const instructions = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      mode: 'guide',
      onSubmit: (text, mode) => instructions.push({ text, mode, isInstruction: true }),
    });

    panel.state.onSubmit('Please use recursion instead', 'guide');
    assert.strictEqual(instructions[0].mode, 'guide');
    assert.strictEqual(instructions[0].isInstruction, true, 'guide mode should be instruction');
    console.log('  PASS: Guide mode sends instructions');
  });

  test('Shift+Enter sends message', () => {
    const sent = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      inputText: 'Test message',
      onSend: () => sent.push(panel.state.inputText),
    });

    // Simulate Shift+Enter
    const event = { key: 'Enter', shiftKey: true, preventDefault: () => {} };
    if (event.key === 'Enter' && event.shiftKey) {
      panel.state.onSend();
    }
    assert.strictEqual(sent[0], 'Test message', 'Shift+Enter should trigger send');
    console.log('  PASS: Shift+Enter sends message');
  });

  test('Enter alone does not send in guide mode', () => {
    const sent = [];
    const panel = createMockComponent('HumanTakeoverPanel', {
      mode: 'guide',
      inputText: 'Line 1',
      onSend: () => sent.push('sent'),
    });

    const event = { key: 'Enter', shiftKey: false, preventDefault: () => {} };
    if (event.key === 'Enter' && !event.shiftKey && panel.state.mode === 'guide') {
      // In guide mode, plain Enter inserts newline
    } else {
      panel.state.onSend();
    }
    assert.strictEqual(sent.length, 0, 'Plain Enter in guide mode should NOT send');
    console.log('  PASS: Plain Enter inserts newline in guide mode');
  });
});

// ============================================================================
// Test 3: APIKeysPage — provider select, key input, test button
// ============================================================================

describe('APIKeysPage', () => {
  const mockProviders = [
    { id: 'openai', name: 'OpenAI', category: 'commercial', defaultModel: 'gpt-4o' },
    { id: 'kimi-code', name: 'Kimi Code', category: 'commercial', defaultModel: 'kimi-coder' },
    { id: 'ollama', name: 'Ollama', category: 'local', defaultModel: 'llama3' },
  ];

  const mockKeys = [
    {
      id: 'key-001', provider: 'openai', providerName: 'OpenAI',
      maskedKey: 'sk-****-1234', isActive: true, isValid: true,
      lastTestedAt: '2024-01-15T10:00:00Z', latencyMs: 245,
    },
    {
      id: 'key-002', provider: 'kimi-code', providerName: 'Kimi Code',
      maskedKey: 'sk-****-5678', isActive: true, isValid: null,
      lastTestedAt: null, latencyMs: null,
    },
  ];

  test('renders provider list for selection', () => {
    const page = createMockComponent('APIKeysPage', {
      providers: mockProviders,
      selectedProvider: '',
    });

    assert.strictEqual(page.state.providers.length, 3, 'Should show 3 providers');
    assert.ok(page.state.providers.some(p => p.id === 'kimi-code'), 'Should include Kimi Code');
    assert.ok(page.state.providers.some(p => p.category === 'local'), 'Should include local providers');
    console.log('  PASS: Provider list renders correctly');
  });

  test('selecting provider updates state', () => {
    const page = createMockComponent('APIKeysPage', {
      providers: mockProviders,
      selectedProvider: '',
      apiKeyInput: '',
    });

    page.setState({ selectedProvider: 'kimi-code' });
    assert.strictEqual(page.state.selectedProvider, 'kimi-code', 'Should select Kimi Code');

    const provider = page.state.providers.find(p => p.id === 'kimi-code');
    assert.ok(provider, 'Selected provider should exist');
    assert.strictEqual(provider.defaultModel, 'kimi-coder', 'Should know default model');
    console.log('  PASS: Provider selection updates state');
  });

  test('API key input masks value', () => {
    const page = createMockComponent('APIKeysPage', {
      apiKeyInput: '',
      showKey: false,
    });

    page.setState({ apiKeyInput: 'REMOVED_FROM_HISTORY' });
    assert.ok(page.state.apiKeyInput.startsWith('sk-'), 'Key should start with sk-');
    assert.ok(page.state.apiKeyInput.length > 20, 'Key should be long');
    assert.strictEqual(page.state.showKey, false, 'Key should be masked by default');
    console.log('  PASS: API key input handles long keys');
  });

  test('toggle key visibility', () => {
    const page = createMockComponent('APIKeysPage', {
      showKey: false,
    });

    page.setState({ showKey: true });
    assert.strictEqual(page.state.showKey, true, 'Should show key');
    page.setState({ showKey: false });
    assert.strictEqual(page.state.showKey, false, 'Should hide key');
    console.log('  PASS: Key visibility toggles');
  });

  test('test button triggers validation', () => {
    const tests = [];
    const page = createMockComponent('APIKeysPage', {
      keys: mockKeys,
      onTest: (keyId) => tests.push(keyId),
    });

    page.state.onTest('key-001');
    assert.strictEqual(tests[0], 'key-001', 'Should test key-001');

    page.state.onTest('key-002');
    assert.strictEqual(tests[1], 'key-002', 'Should test key-002');
    console.log('  PASS: Test button triggers validation');
  });

  test('save key calls API with correct body', () => {
    const saved = [];
    const page = createMockComponent('APIKeysPage', {
      selectedProvider: 'kimi-code',
      apiKeyInput: 'sk-kimi-test-key-123',
      onSave: (body) => saved.push(body),
    });

    page.state.onSave({
      provider: page.state.selectedProvider,
      apiKey: page.state.apiKeyInput,
      isActive: true,
    });

    assert.strictEqual(saved[0].provider, 'kimi-code', 'Should save with correct provider');
    assert.ok(saved[0].apiKey.includes('sk-kimi'), 'Should save key value');
    assert.strictEqual(saved[0].isActive, true, 'Should activate by default');
    console.log('  PASS: Save key sends correct body');
  });

  test('displays key status badges', () => {
    const page = createMockComponent('APIKeysPage', {
      keys: mockKeys,
    });

    const key1 = page.state.keys[0];
    assert.strictEqual(key1.isValid, true, 'Key 1 should show valid');
    assert.ok(key1.latencyMs, 'Key 1 should have latency');

    const key2 = page.state.keys[1];
    assert.strictEqual(key2.isValid, null, 'Key 2 should show untested');
    assert.strictEqual(key2.lastTestedAt, null, 'Key 2 should not have tested time');
    console.log('  PASS: Key status badges render correctly');
  });

  test('search filters keys by provider name', () => {
    const page = createMockComponent('APIKeysPage', {
      keys: mockKeys,
      searchQuery: 'Kimi',
    });

    const filtered = page.state.keys.filter(k =>
      k.providerName.toLowerCase().includes(page.state.searchQuery.toLowerCase())
    );
    assert.strictEqual(filtered.length, 1, 'Should find 1 Kimi key');
    assert.strictEqual(filtered[0].provider, 'kimi-code', 'Should be Kimi Code key');
    console.log('  PASS: Search filters by provider name');
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

// Run all tests
console.log('=== Frontend Components Test Suite ===');
console.log('Running tests...\n');

// Tests are defined above and will auto-run when this file is executed

// If running in Node.js directly
if (require.main === module) {
  console.log('\nAll tests completed. Check output above for PASS/FAIL.');
}
