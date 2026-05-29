# 千界花园 — 桌面版打包指南

## 一键打包（双击即用）

### Windows (.exe)

```bash
cd electron
npm install
npm run dist
```

产出：`dist/千界花园 Setup 1.0.0.exe`

### macOS (.dmg)

```bash
cd electron
npm install
npm run dist
```

产出：`dist/千界花园-1.0.0.dmg`

### Linux (AppImage)

```bash
cd electron
npm install
npm run dist
```

产出：`dist/千界花园-1.0.0.AppImage`

## 使用方式

1. **下载安装包**
2. **双击安装**
3. **桌面快捷方式启动**
4. **浏览器自动打开** http://localhost:3000

## 内置功能

- ✅ 后端 Node.js 服务（自动启动）
- ✅ 前端 React 应用
- ✅ 54 个 LLM 平台适配器
- ✅ 5 个 Kimi Code API 密钥（已配置）
- ✅ SQLite 数据库（本地存储）
- ✅ Prisma Studio（数据库管理）

## 开发模式

```bash
cd electron
npm install
npm start
```

## 环境变量（可选）

```bash
# 如果需要接入其他平台
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
export CLAUDE_API_KEY="sk-ant-..."
```
