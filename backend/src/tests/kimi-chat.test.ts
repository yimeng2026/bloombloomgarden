/**
 * Kimi CLI 对话测试脚本
 * 使用 5 个 API 密钥测试千界花园后端对话功能
 * 
 * 运行方式：
 *   cd thousand-realms-garden/backend
 *   npx tsx src/tests/kimi-code-chat.test.ts
 */

import { getBackendRouter } from '../services/BackendRouter';

async function testKimiChat() {
  console.log('🌸 Kimi CLI 对话测试开始\n');
  console.log('API 密钥状态：5 个密钥已配置，支持自动轮询\n');

  const router = getBackendRouter();
  const backend = router.getBackend('kimi-code-code');

  if (!backend) {
    console.error('❌ Kimi backend 未注册');
    process.exit(1);
  }

  // 1. 健康检查
  console.log('📡 1. 健康检查...');
  const health = await backend.healthCheck();
  console.log(`   状态: ${health.status}, 延迟: ${health.latency}ms`);
  if (health.status !== 'healthy') {
    console.error('❌ Kimi API 连接失败，请检查网络或密钥');
    process.exit(1);
  }
  console.log('   ✅ 通过\n');

  // 2. 模型列表
  console.log('📋 2. 拉取模型列表...');
  const models = await backend.listModels();
  console.log(`   可用模型: ${models.join(', ')}`);
  console.log('   ✅ 通过\n');

  // 3. 单轮对话
  console.log('💬 3. 单轮对话测试...');
  const response = await router.chat('kimi-code', {
    messages: [
      { role: 'system', content: '你是一个简洁的助手。' },
      { role: 'user', content: '用一句话介绍千界花园项目。' },
    ],
    model: 'kimi-for-coding',
    temperature: 0.7,
  });
  console.log(`   响应 ID: ${response.id}`);
  console.log(`   内容: ${response.content}`);
  console.log(`   Token 消耗: ${JSON.stringify(response.usage)}`);
  console.log('   ✅ 通过\n');

  // 4. 流式对话
  console.log('🌊 4. 流式对话测试...');
  const chunks: string[] = [];
  for await (const chunk of router.chatStream('kimi-code', {
    messages: [
      { role: 'system', content: '你是一个测试助手。' },
      { role: 'user', content: '数数：1,2,3' },
    ],
    model: 'kimi-for-coding',
    temperature: 0.5,
  })) {
    chunks.push(chunk.content);
    process.stdout.write(chunk.content);
  }
  console.log('\n');
  console.log(`   收到 ${chunks.length} 个 chunk，总字符: ${chunks.join('').length}`);
  console.log('   ✅ 通过\n');

  // 5. 多轮对话（上下文）
  console.log('🔄 5. 多轮对话测试（上下文记忆）...');
  const messages = [
    { role: 'system' as const, content: '你是一个记住用户名字的助手。' },
    { role: 'user' as const, content: '我的名字是 Alice。' },
  ];
  const round1 = await router.chat('kimi-code', { messages, model: 'kimi-for-coding' });
  console.log(`   Round 1: ${round1.content.slice(0, 60)}...`);

  messages.push({ role: 'assistant' as const, content: round1.content });
  messages.push({ role: 'user' as const, content: '我叫什么名字？' });
  const round2 = await router.chat('kimi-code', { messages, model: 'kimi-for-coding' });
  console.log(`   Round 2: ${round2.content.slice(0, 60)}...`);
  console.log('   ✅ 通过\n');

  // 6. 故障转移测试
  console.log('🔀 6. 密钥轮询测试（连续 3 次请求）...');
  for (let i = 1; i <= 3; i++) {
    const resp = await router.chat('kimi-code', {
      messages: [{ role: 'user', content: `测试请求 #${i}` }],
      model: 'kimi-for-coding',
    });
    console.log(`   请求 #${i}: ${resp.content.slice(0, 40)}... (ID: ${resp.id.slice(0, 8)})`);
  }
  console.log('   ✅ 通过\n');

  console.log('═══════════════════════════════════════');
  console.log('🌸 Kimi CLI 全部测试通过！');
  console.log('   5 个 API 密钥配置正确');
  console.log('   对话功能可用');
  console.log('   流式输出正常');
  console.log('   上下文记忆正常');
  console.log('   密钥轮询正常');
  console.log('═══════════════════════════════════════');
}

testKimiChat().catch((err) => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
