# 千界花园 — Git 推送与 DockerHub 部署完整指南

> 用户目标：解决 git push 失败 → GitHub 仓库 → 自动构建 Docker 镜像 → 推送到 DockerHub（用户名：zmx72）

---

## 一、Git Push 失败排查清单

### 1.1 最常见错误与解决

**错误 A：fatal: not a git repository**
```bash
# 原因：目录下没有 git 仓库
# 解决：初始化仓库
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

**错误 B：fatal: unable to access ... Could not resolve host**
```bash
# 原因：网络无法连接 GitHub（国内常见）
# 解决：配置代理或使用镜像
# 方法1：配置代理（如果你有梯子）
git config --global http.proxy http://127.0.0.1:7890  # 改为你代理端口
git config --global https.proxy http://127.0.0.1:7890

# 方法2：取消代理（如果代理不通）
git config --global --unset http.proxy
git config --global --unset https.proxy

# 方法3：使用国内镜像（仅clone可用，push需用https）
git remote set-url origin https://ghproxy.com/https://github.com/zmx72/thousand-realms-garden.git
```

**错误 C：fatal: Authentication failed**
```bash
# 原因：GitHub 取消了密码登录，需要使用 Personal Access Token
# 解决：生成 Token 后使用

# 步骤1：去 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
# 勾选：repo（全部读写权限）

# 步骤2：推送时用户名是你的 GitHub 用户名，密码填 Token
# 或者先配置好：
git remote set-url origin https://zmx72:YOUR_TOKEN@github.com/zmx72/thousand-realms-garden.git
```

**错误 D：Updates were rejected**
```bash
# 原因：远程仓库已有内容，本地没有同步
# 解决：先拉取再推送
git pull origin main --allow-unrelated-histories
git push origin main
```

**错误 E：OpenSSL SSL_read: Connection was reset**
```bash
# 原因：网络不稳定或SSL握手失败
# 解决：增大buffer或关闭SSL验证（仅开发环境）
git config --global http.postBuffer 524288000
git config --global http.sslVerify false
# 或者换用SSH方式（推荐）
```

---

## 二、完整推送流程（推荐用 SSH）

### 2.1 生成 SSH Key（如果没做过）

```bash
# 检查是否已有SSH key
ls ~/.ssh/id_ed25519.pub 2>/dev/null || ls ~/.ssh/id_rsa.pub 2>/dev/null

# 如果没有，生成一个
ssh-keygen -t ed25519 -C "your-email@example.com"
# 一路回车，默认保存到 ~/.ssh/id_ed25519

# 复制公钥内容到剪贴板（Windows PowerShell）
cat ~/.ssh/id_ed25519.pub | clip
# （macOS）
pbcopy < ~/.ssh/id_ed25519.pub
# （Linux）
xclip -selection clipboard < ~/.ssh/id_ed25519.pub
```

然后去 GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴公钥。

### 2.2 完整推送命令

```bash
cd thousand-realms-garden  # 进入项目目录

# 初始化（如果还没做）
git init
git add .
git commit -m "千界花园 v1.0.0 初始提交"
git branch -M main

# 关联远程仓库（用SSH方式，更稳定）
git remote add origin git@github.com:zmx72/thousand-realms-garden.git

# 如果已经关联了https，先删除再添加
# git remote remove origin
# git remote add origin git@github.com:zmx72/thousand-realms-garden.git

# 测试SSH连通
git remote -v
ssh -T git@github.com  # 应该显示：Hi zmx72! You've successfully authenticated...

# 推送
git push -u origin main
```

---

## 三、DockerHub 自动推送（用户名：zmx72）

### 3.1 在 GitHub 添加 DockerHub 认证

1. 登录 DockerHub：https://hub.docker.com/
2. 点击右上角头像 → Account Settings → Security → New Access Token
3. 填名称：`thousand-realms-garden-cicd`，权限选 Read, Write, Delete
4. 复制生成的 Token（只显示一次，妥善保存）

然后到 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 值 |
|------------|-----|
| `DOCKER_USERNAME` | `zmx72` |
| `DOCKER_PASSWORD` | 刚才复制的 DockerHub Access Token |
| `DOCKER_IMAGE_NAME` | `zmx72/thousand-realms-garden` |

### 3.2 GitHub Actions 已配置

项目已包含 `.github/workflows/full-cicd.yml`，每次 push 到 main 分支会自动：
1. 测试后端代码
2. 构建前端
3. 构建 Docker 镜像
4. 推送到 DockerHub（zmx72/thousand-realms-garden）

### 3.3 手动推送 Docker 镜像（本地操作）

如果你想在本地构建并推送：

```bash
# 1. 登录 DockerHub
docker login -u zmx72
# 输入密码（DockerHub Access Token）

# 2. 构建镜像
cd thousand-realms-garden
docker build -t zmx72/thousand-realms-garden:latest .

# 3. 推送
docker push zmx72/thousand-realms-garden:latest

# 4. 也可以打版本标签
docker tag zmx72/thousand-realms-garden:latest zmx72/thousand-realms-garden:v1.0.0
docker push zmx72/thousand-realms-garden:v1.0.0
```

### 3.4 从 DockerHub 拉取运行

任何服务器/本地都可以一键运行：

```bash
docker pull zmx72/thousand-realms-garden:latest
docker run -d \
  -p 3001:3001 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -e JWT_SECRET=your-secret \
  -v trg-data:/app/backend/data \
  -v trg-uploads:/app/backend/uploads \
  --name thousand-realms-garden \
  zmx72/thousand-realms-garden:latest
```

---

## 四、快速诊断脚本

如果你还是 push 不成功，在项目目录运行这个脚本，把输出贴给我：

**Windows (PowerShell):**
```powershell
Write-Host "=== Git 诊断 ===" -ForegroundColor Cyan
git --version
git remote -v
git status
git log --oneline -3
git config --list | findstr remote
Write-Host "=== 网络诊断 ===" -ForegroundColor Cyan
ping github.com -n 2
Test-NetConnection github.com -Port 443
```

**macOS/Linux:**
```bash
echo "=== Git 诊断 ==="
git --version
git remote -v
git status
git log --oneline -3
git config --list | grep remote
echo "=== 网络诊断 ==="
ping -c 2 github.com
curl -I https://github.com 2>&1 | head -5
```

把输出结果直接粘贴给我，我帮你精准定位问题。