# backend/deployments/DEPLOY.md
# Bloom Bloom Garden - 完整部署指南

## 快速开始（5分钟）

### 1. 安装 Docker 和 Docker Compose

**Ubuntu/Debian:**
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
docker --version
docker compose version

# 将当前用户加入docker组（免sudo）
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

**macOS (使用 Homebrew):**
```bash
brew install --cask docker
# 或
brew install docker docker-compose
```

**Windows:**
下载 Docker Desktop: https://www.docker.com/products/docker-desktop

---

### 2. 克隆仓库并进入部署目录

```bash
git clone https://github.com/yimeng2026/bloombloomgarden.git
cd bloombloomgarden/backend/deployments
```

---

### 3. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，填入你的API Key
nano .env
```

**必须配置的Key（已验证有效）:**
```env
KIMI_CODE_KEY_1=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_2=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_3=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_4=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_5=REMOVED_FROM_HISTORY
```

**可选配置（其他平台API Key）:**
```env
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
# ... 其他平台
```

---

### 4. 部署核心平台

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 部署核心平台（推荐）
./deploy.sh core

# 或部署全部平台
./deploy.sh all
```

**核心平台包括:**
| 平台 | 端口 | 说明 |
|------|------|------|
| Ollama | 11434 | 本地模型运行 |
| Open WebUI | 8080 | 对话界面 |
| Dify | 81 | LLM应用开发 |
| Flowise | 3002 | 可视化工作流 |
| n8n | 5678 | 自动化工作流 |
| Postgres | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| MongoDB | 27017 | 文档数据库 |

---

### 5. 拉取Ollama模型

```bash
# 等待Ollama启动完成
sleep 10

# 拉取常用模型
docker exec ollama ollama pull llama3.1:8b
docker exec ollama ollama pull qwen2.5:7b
docker exec ollama ollama pull mistral:7b
docker exec ollama ollama pull nomic-embed-text
```

---

### 6. 启动后端代理服务

```bash
# 回到后端根目录
cd ../..

# 安装依赖
npm install

# 启动服务
npm start
```

服务将运行在 `http://localhost:3001`

---

### 7. 验证部署

```bash
# 查看所有服务状态
./deployments/deploy.sh status

# 测试代理服务
curl http://localhost:3001/health

# 测试Kimi Code API
curl -X POST http://localhost:3001/api/kimi-code/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k2.5",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 50
  }'
```

---

### 8. 访问前端

```bash
# 回到前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 `http://localhost:5173`

---

## 平台访问地址

部署完成后，各平台可通过以下地址访问:

| 平台 | 本地地址 | 通过代理 |
|------|---------|---------|
| Open WebUI | http://localhost:8080 | http://localhost:3001/api/open-webui |
| Dify | http://localhost:81 | http://localhost:3001/api/dify |
| Flowise | http://localhost:3002 | http://localhost:3001/api/flowise |
| n8n | http://localhost:5678 | http://localhost:3001/api/n8n |
| Ollama | http://localhost:11434 | http://localhost:3001/api/ollama |
| LibreChat | http://localhost:3080 | http://localhost:3001/api/librechat |
| AnythingLLM | http://localhost:3001 | http://localhost:3001/api/anythingllm |
| LobeChat | http://localhost:3210 | http://localhost:3001/api/lobechat |
| LocalAI | http://localhost:8081 | http://localhost:3001/api/localai |

---

## 常用命令

```bash
# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs [服务名]

# 停止所有服务
./deploy.sh stop

# 重启单个服务
docker-compose restart [服务名]

# 更新镜像
docker-compose pull
docker-compose up -d

# 进入容器
docker exec -it [容器名] /bin/bash
```

---

## Railway部署

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
cd backend/deployments
railway up

# 添加环境变量
railway variables set KIMI_CODE_KEY_1=sk-xxx
```

---

## 故障排除

### 端口冲突
如果端口被占用，修改 `docker-compose.yml` 中的端口映射:
```yaml
ports:
  - "8080:8080"  # 改为 "8081:8080" 等
```

### 内存不足
Ollama模型需要大量内存，建议:
- 至少 8GB RAM（运行小模型）
- 16GB+ RAM（运行大模型）
- 或使用 GPU（修改docker-compose.yml中的deploy部分）

### API Key无效
- 确认 `.env` 文件已正确配置
- 确认Key格式正确（以 `sk-` 开头）
- 对于Kimi Code Key，确认使用 `https://api.kimi.com/coding/v1` endpoint

---

## 安全提示

1. **永远不要将 `.env` 文件提交到Git**
2. **定期更换API Key**
3. **使用防火墙限制端口访问**
4. **生产环境使用HTTPS**
5. **设置强密码**

---

## 支持

遇到问题？
- 查看日志: `./deploy.sh logs`
- 检查状态: `./deploy.sh status`
- 提交Issue: https://github.com/yimeng2026/bloombloomgarden/issues
