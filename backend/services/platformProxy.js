/**
 * backend/services/platformProxy.js
 * 平台统一代理服务
 * 
 * 功能：
 * 1. 代理所有平台的API请求
 * 2. 管理API Key轮换
 * 3. 处理流式输出
 * 4. 统一错误处理
 * 5. 支持所有10个API直连平台 + 本地部署平台
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// 平台配置
// ═══════════════════════════════════════════════════════════════

const PLATFORMS = {
  // API直连平台
  openai: {
    baseUrl: 'https://api.openai.com',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    apiKeyHeader: 'x-api-key',
    apiKeyPrefix: '',
    models: ['claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus'],
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.cn',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  'kimi-code': {
    baseUrl: 'https://api.kimi.com/coding',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['kimi-k2.5'],
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKeyHeader: 'key',
    apiKeyPrefix: '',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['llama-3.1-70b', 'mixtral-8x7b', 'gemma-2-9b'],
  },
  fireworks: {
    baseUrl: 'https://api.fireworks.ai/inference',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['llama-3.1-70b', 'llama-3.1-405b', 'mixtral-8x22b'],
  },
  together: {
    baseUrl: 'https://api.together.xyz',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['llama-3.1-70b', 'llama-3.1-405b', 'mixtral-8x22b'],
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  },
  cohere: {
    baseUrl: 'https://api.cohere.com',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    models: ['command-r-plus', 'command-r', 'command'],
  },
  
  // 本地部署平台
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    apiKeyHeader: null,
    models: ['llama3.1', 'mistral', 'qwen2.5', 'codellama'],
  },
  'open-webui': {
    baseUrl: process.env.OPEN_WEBUI_URL || 'http://localhost:8080',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
  dify: {
    baseUrl: process.env.DIFY_URL || 'http://localhost:81',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
  flowise: {
    baseUrl: process.env.FLOWISE_URL || 'http://localhost:3002',
    apiKeyHeader: null,
  },
  n8n: {
    baseUrl: process.env.N8N_URL || 'http://localhost:5678',
    apiKeyHeader: 'X-N8N-API-KEY',
  },
  localai: {
    baseUrl: process.env.LOCALAI_URL || 'http://localhost:8081',
    apiKeyHeader: null,
  },
  librechat: {
    baseUrl: process.env.LIBRECHAT_URL || 'http://localhost:3080',
    apiKeyHeader: null,
  },
  anythingllm: {
    baseUrl: process.env.ANYTHINGLLM_URL || 'http://localhost:3001',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
  lobechat: {
    baseUrl: process.env.LOBECHAT_URL || 'http://localhost:3210',
    apiKeyHeader: null,
  },
};

// Kimi Code API Keys 轮换管理
const KIMI_CODE_KEYS = [
  process.env.KIMI_CODE_KEY_1,
  process.env.KIMI_CODE_KEY_2,
  process.env.KIMI_CODE_KEY_3,
  process.env.KIMI_CODE_KEY_4,
  process.env.KIMI_CODE_KEY_5,
].filter(Boolean);

let currentKeyIndex = 0;

function getNextKimiCodeKey() {
  if (KIMI_CODE_KEYS.length === 0) return null;
  const key = KIMI_CODE_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % KIMI_CODE_KEYS.length;
  return key;
}

// ═══════════════════════════════════════════════════════════════
// 路由配置
// ═══════════════════════════════════════════════════════════════

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', platforms: Object.keys(PLATFORMS) });
});

// 获取所有平台状态
app.get('/api/platforms', async (req, res) => {
  const statuses = {};
  
  for (const [id, config] of Object.entries(PLATFORMS)) {
    try {
      const response = await fetch(`${config.baseUrl}/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      statuses[id] = { status: 'online', url: config.baseUrl };
    } catch {
      statuses[id] = { status: 'offline', url: config.baseUrl };
    }
  }
  
  res.json(statuses);
});

// 代理所有平台请求 /api/:platform/*
app.use('/api/:platform', (req, res, next) => {
  const platformId = req.params.platform;
  const platform = PLATFORMS[platformId];
  
  if (!platform) {
    return res.status(404).json({ error: `Platform ${platformId} not found` });
  }
  
  // 构建代理选项
  const proxyOptions = {
    target: platform.baseUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${platformId}`]: '',
    },
    onProxyReq: (proxyReq, req) => {
      // 添加API Key
      if (platform.apiKeyHeader) {
        const apiKey = req.headers['x-api-key'] || process.env[`${platformId.toUpperCase()}_API_KEY`];
        if (apiKey) {
          const value = platform.apiKeyPrefix ? `${platform.apiKeyPrefix}${apiKey}` : apiKey;
          proxyReq.setHeader(platform.apiKeyHeader, value);
        }
      }
      
      // Kimi Code特殊处理 - 添加User-Agent
      if (platformId === 'kimi-code' || platformId === 'moonshot') {
        proxyReq.setHeader('User-Agent', 'claude-code/0.1.0');
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${platformId}:`, err.message);
      res.status(502).json({ 
        error: `Platform ${platformId} unavailable`, 
        message: err.message 
      });
    },
  };
  
  createProxyMiddleware(proxyOptions)(req, res, next);
});

// Kimi Code专用代理 (带Key轮换)
app.post('/api/kimi-code/chat/completions', async (req, res) => {
  const apiKey = getNextKimiCodeKey();
  
  if (!apiKey) {
    return res.status(401).json({ error: 'No Kimi Code API Key configured' });
  }
  
  try {
    const response = await fetch('https://api.kimi.com/coding/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'claude-code/0.1.0',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }
    
    // 流式输出处理
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 启动服务
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     Bloom Bloom Garden - 平台统一代理服务                      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`平台列表: http://localhost:${PORT}/api/platforms`);
  console.log('');
  console.log('已配置平台:');
  Object.entries(PLATFORMS).forEach(([id, config]) => {
    console.log(`  - ${id}: ${config.baseUrl}`);
  });
  console.log('');
  console.log(`Kimi Code Keys: ${KIMI_CODE_KEYS.length} 个`);
});

module.exports = app;
