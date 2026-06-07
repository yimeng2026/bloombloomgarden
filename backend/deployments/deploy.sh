#!/bin/bash
# backend/deployments/deploy.sh
# 一键部署所有平台到本地/Railway

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="bloom-bloomgarden"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建环境变量文件
create_env_file() {
    log_info "创建环境变量文件..."
    
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        cat > "$SCRIPT_DIR/.env" << EOF
# API Keys (请填入你的真实API Key)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
MOONSHOT_API_KEY=your-moonshot-api-key
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
FIREWORKS_API_KEY=your-fireworks-api-key
TOGETHER_API_KEY=your-together-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
MISTRAL_API_KEY=your-mistral-api-key
COHERE_API_KEY=your-cohere-api-key

# Kimi Code API Keys
KIMI_CODE_KEY_1=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_2=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_3=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_4=REMOVED_FROM_HISTORY
KIMI_CODE_KEY_5=REMOVED_FROM_HISTORY

# 数据库密码
POSTGRES_PASSWORD=bloom-postgres-secure
REDIS_PASSWORD=bloom-redis-secure

# 其他配置
DOMAIN=localhost
EOF
        log_warn "已创建 .env 文件，请编辑填入真实的 API Key"
    else
        log_info ".env 文件已存在"
    fi
}

# 部署核心平台 (推荐)
deploy_core() {
    log_info "部署核心平台..."
    
    cd "$SCRIPT_DIR"
    
    # 只启动核心服务
    docker-compose -p "$PROJECT_NAME" up -d \
        ollama \
        open-webui \
        dify dify-web \
        flowise \
        n8n \
        postgres redis mongo meilisearch
    
    log_success "核心平台部署完成"
}

# 部署全部平台
deploy_all() {
    log_info "部署全部平台..."
    
    cd "$SCRIPT_DIR"
    docker-compose -p "$PROJECT_NAME" up -d
    
    log_success "全部平台部署完成"
}

# 部署单个平台
deploy_single() {
    local service=$1
    log_info "部署平台: $service"
    
    cd "$SCRIPT_DIR"
    docker-compose -p "$PROJECT_NAME" up -d "$service"
    
    log_success "$service 部署完成"
}

# 拉取Ollama模型
pull_ollama_models() {
    log_info "拉取Ollama默认模型..."
    
    # 等待Ollama启动
    sleep 5
    
    # 拉取常用模型
    docker exec ollama ollama pull llama3.1:8b || log_warn "llama3.1:8b 拉取失败"
    docker exec ollama ollama pull qwen2.5:7b || log_warn "qwen2.5:7b 拉取失败"
    docker exec ollama ollama pull mistral:7b || log_warn "mistral:7b 拉取失败"
    docker exec ollama ollama pull nomic-embed-text || log_warn "nomic-embed-text 拉取失败"
    
    log_success "Ollama模型拉取完成"
}

# 显示状态
show_status() {
    log_info "平台运行状态:"
    echo ""
    echo -e "${BLUE}服务名称              端口        状态${NC}"
    echo "─────────────────────────────────────────"
    
    declare -A services=(
        ["open-webui"]="8080"
        ["librechat"]="3080"
        ["anythingllm"]="3001"
        ["lobechat"]="3210"
        ["ollama"]="11434"
        ["localai"]="8081"
        ["dify-web"]="81"
        ["flowise"]="3002"
        ["n8n"]="5678"
        ["langgraph-studio"]="2024"
        ["postgres"]="5432"
        ["redis"]="6379"
        ["mongo"]="27017"
        ["meilisearch"]="7700"
    )
    
    for service in "${!services[@]}"; do
        port="${services[$service]}"
        if docker ps --format "{{.Names}}" | grep -q "^${PROJECT_NAME}_${service}"; then
            echo -e "${GREEN}✓${NC} ${service:0:20}  ${port}       运行中"
        else
            echo -e "${RED}✗${NC} ${service:0:20}  ${port}       未运行"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo "  Open WebUI:    http://localhost:8080"
    echo "  LibreChat:     http://localhost:3080"
    echo "  AnythingLLM:   http://localhost:3001"
    echo "  LobeChat:      http://localhost:3210"
    echo "  Dify:          http://localhost:81"
    echo "  Flowise:       http://localhost:3002"
    echo "  n8n:           http://localhost:5678"
    echo "  Ollama API:    http://localhost:11434"
    echo "  LocalAI:       http://localhost:8081"
}

# 停止所有服务
stop_all() {
    log_info "停止所有服务..."
    cd "$SCRIPT_DIR"
    docker-compose -p "$PROJECT_NAME" down
    log_success "所有服务已停止"
}

# 查看日志
show_logs() {
    local service=$1
    cd "$SCRIPT_DIR"
    if [ -n "$service" ]; then
        docker-compose -p "$PROJECT_NAME" logs -f "$service"
    else
        docker-compose -p "$PROJECT_NAME" logs -f
    fi
}

# 主函数
main() {
    case "${1:-help}" in
        core)
            check_dependencies
            create_env_file
            deploy_core
            pull_ollama_models
            show_status
            ;;
        all)
            check_dependencies
            create_env_file
            deploy_all
            pull_ollama_models
            show_status
            ;;
        deploy)
            if [ -z "$2" ]; then
                log_error "请指定要部署的平台名称"
                echo "用法: ./deploy.sh deploy <平台名称>"
                exit 1
            fi
            check_dependencies
            deploy_single "$2"
            ;;
        status)
            show_status
            ;;
        stop)
            stop_all
            ;;
        logs)
            show_logs "$2"
            ;;
        help|*)
            echo "Bloom Bloom Garden - 平台部署脚本"
            echo ""
            echo "用法:"
            echo "  ./deploy.sh core              部署核心平台 (推荐)"
            echo "  ./deploy.sh all               部署全部平台"
            echo "  ./deploy.sh deploy <平台>     部署单个平台"
            echo "  ./deploy.sh status            查看运行状态"
            echo "  ./deploy.sh stop              停止所有服务"
            echo "  ./deploy.sh logs [平台]        查看日志"
            echo ""
            echo "核心平台包括:"
            echo "  - Ollama (本地模型运行)"
            echo "  - Open WebUI (对话界面)"
            echo "  - Dify (LLM应用开发)"
            echo "  - Flowise (可视化工作流)"
            echo "  - n8n (自动化工作流)"
            ;;
    esac
}

main "$@"
