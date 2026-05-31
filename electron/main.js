const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

const KIMI_KEYS = [
  'KIMI_KEY_1_PLACEHOLDER',
  'KIMI_KEY_2_PLACEHOLDER',
  'KIMI_KEY_3_PLACEHOLDER',
  'KIMI_KEY_4_PLACEHOLDER',
  'KIMI_KEY_5_PLACEHOLDER',
];

function injectEnv() {
  process.env.KIMI_CODE_API_KEY_1 = KIMI_KEYS[0];
  process.env.KIMI_CODE_API_KEY_2 = KIMI_KEYS[1];
  process.env.KIMI_CODE_API_KEY_3 = KIMI_KEYS[2];
  process.env.KIMI_CODE_API_KEY_4 = KIMI_KEYS[3];
  process.env.KIMI_CODE_API_KEY_5 = KIMI_KEYS[4];
  process.env.KIMICODE_API_KEY = KIMI_KEYS[0];
  process.env.OPENROUTER_API_KEY = 'OPENROUTER_API_KEY_PLACEHOLDER';
  process.env.ELECTRON_MODE = 'true';
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3001';
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

function resolveBackendPath() {
  const candidates = [
    path.join(process.resourcesPath, 'backend'),
    path.join(__dirname, '../backend'),
    path.join(__dirname, '../../backend'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[Backend] Found at: ${p}`);
      return p;
    }
  }
  console.error('[Backend] Not found in any candidate path');
  return null;
}

function startBackend() {
  const backendPath = resolveBackendPath();
  if (!backendPath) {
    return Promise.reject(new Error('找不到后端目录'));
  }

  const distServer = path.join(backendPath, 'dist/server.js');
  const distServerWin = path.join(backendPath, 'dist\\server.js');

  let serverFile;
  if (fs.existsSync(distServer)) {
    serverFile = distServer;
  } else if (fs.existsSync(distServerWin)) {
    serverFile = distServerWin;
  } else {
    return Promise.reject(new Error('找不到 dist/server.js，请先编译后端'));
  }

  console.log(`[Backend] Starting: ${serverFile}`);

  backendProcess = spawn(process.execPath, [serverFile], {
    cwd: backendPath,
    env: { ...process.env, ELECTRON_MODE: 'true', NODE_ENV: 'production', PORT: '3001' },
    windowsHide: true,
    stdio: 'pipe',
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] 进程退出，代码 ${code}`);
  });

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 60;
    const checkInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('http://localhost:3001/health');
        if (res.ok) {
          clearInterval(checkInterval);
          console.log('[Backend] 健康检查通过');
          resolve();
        }
      } catch {
        // 后端还没启动，继续等待
      }
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('后端启动超时（30秒）'));
      }
    }, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '千界花园 — 群智协同平台',
    show: false,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // 走 HTTP 协议，彻底解决 file:// 白屏
  mainWindow.loadURL('http://localhost:3001');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    injectEnv();
    console.log('🌸 千界花园启动中...');
    await startBackend();
    console.log('✅ 后端就绪，打开窗口...');
    createWindow();
  } catch (err) {
    console.error('❌ 启动失败:', err.message);

    // 后端失败时显示错误提示，而不是白屏
    mainWindow = new BrowserWindow({
      width: 600,
      height: 400,
      title: '千界花园 — 启动错误',
    });
    mainWindow.loadURL(
      `data:text/html,<html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:40px;text-align:center;color:#333}h1{color:#e74c3c}code{background:#f4f4f4;padding:2px 6px;border-radius:3px}</style></head><body><h1>启动失败</h1><p>${err.message}</p><p>请检查后端是否已编译：<code>cd backend && npx tsc</code></p></body></html>`
    );
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// IPC 通信
ipcMain.handle('get-app-version', () => {
  return '1.0.0';
});

ipcMain.handle('get-backend-status', async () => {
  try {
    const response = await fetch('http://localhost:3001/health');
    return { status: response.ok ? 'online' : 'offline', url: 'http://localhost:3001' };
  } catch {
    return { status: 'offline', url: 'http://localhost:3001' };
  }
});

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
  };
});
