#!/bin/bash

# AI访谈机器人项目管理脚本
# 使用方法: ./manage.sh [start|stop|restart|status|build|deploy|logs]

set -e

PROJECT_NAME="ai-interview"
BACKEND_APP_NAME="ai-interview-backend"
PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
LOGS_DIR="$PROJECT_DIR/logs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

# 检查环境
check_environment() {
    log_info "检查运行环境..."
    
    check_command "node"
    check_command "npm" 
    check_command "pm2"
    check_command "mongod"
    
    log_success "环境检查完成"
}

# 确保目录存在
ensure_directories() {
    log_info "确保必要目录存在..."
    
    mkdir -p "$LOGS_DIR"
    
    log_success "目录创建完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装后端依赖
    if [ -f "$BACKEND_DIR/package.json" ]; then
        log_info "安装后端依赖..."
        cd "$BACKEND_DIR"
        npm install --production
        cd "$PROJECT_DIR"
        log_success "后端依赖安装完成"
    fi
    
    # 安装前端依赖
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        log_info "安装前端依赖..."
        cd "$FRONTEND_DIR"
        npm install
        cd "$PROJECT_DIR"
        log_success "前端依赖安装完成"
    fi
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        cd "$FRONTEND_DIR"
        
        # 设置环境变量
        source "$PROJECT_DIR/env.production"
        
        # 构建
        npm run build
        
        cd "$PROJECT_DIR"
        log_success "前端构建完成"
    else
        log_warning "未找到前端package.json文件"
    fi
}

# 启动MongoDB
start_mongodb() {
    log_info "检查MongoDB状态..."
    
    if pgrep mongod > /dev/null; then
        log_success "MongoDB已在运行"
    else
        log_info "启动MongoDB..."
        sudo systemctl start mongod || {
            log_warning "系统服务启动失败，尝试直接启动..."
            mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /var/lib/mongodb
        }
        log_success "MongoDB启动完成"
    fi
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    # 使用PM2启动
    pm2 start ecosystem.config.js --env production
    
    log_success "后端服务启动完成"
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    
    # 停止PM2管理的进程
    pm2 stop $BACKEND_APP_NAME 2>/dev/null || log_warning "后端服务未在运行"
    pm2 delete $BACKEND_APP_NAME 2>/dev/null || true
    
    log_success "服务停止完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    stop_services
    sleep 2
    start_services
    
    log_success "服务重启完成"
}

# 启动服务
start_services() {
    log_info "启动AI访谈机器人服务..."
    
    ensure_directories
    start_mongodb
    start_backend
    
    log_success "所有服务启动完成"
    log_info "HTTPS访问地址: https://121.41.25.186:5000"
    log_info "本地调试地址: http://localhost:5001"
    log_info "注意：外部访问请使用HTTPS协议，以支持语音识别功能"
}

# 查看服务状态
show_status() {
    log_info "服务状态:"
    
    echo ""
    echo "=== PM2 进程状态 ==="
    pm2 status
    
    echo ""
    echo "=== MongoDB 状态 ==="
    if pgrep mongod > /dev/null; then
        log_success "MongoDB: 运行中"
    else
        log_error "MongoDB: 已停止"
    fi
    
    echo ""
    echo "=== 端口占用情况 ==="
    netstat -tlnp | grep :5000 || log_warning "端口5000未被占用(nginx HTTPS)"
    netstat -tlnp | grep :5001 || log_warning "端口5001未被占用(Node.js)"
    netstat -tlnp | grep :27017 || log_warning "端口27017未被占用(MongoDB)"
    
    echo ""
    echo "=== 外网访问状态 ==="
    EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "未知")
    echo "外网IP: $EXTERNAL_IP"
    
    if netstat -tlnp | grep ":5000" > /dev/null; then
        log_success "HTTPS服务已启动"
        echo "本地访问: http://localhost:5001"
        echo "外网HTTPS访问: https://$EXTERNAL_IP:5000"
        
        # 测试外网连通性
        if timeout 5 curl -I http://$EXTERNAL_IP:5000 >/dev/null 2>&1; then
            log_success "外网访问测试通过"
        else
            log_warning "外网访问测试失败"
            echo "可能需要配置云服务器安全组规则开放5000端口"
            echo "阿里云用户请在ECS控制台->安全组->配置规则中添加："
            echo "  - 协议类型: TCP"
            echo "  - 端口范围: 5000/5000"
            echo "  - 源IP: 0.0.0.0/0"
        fi
    else
        log_error "服务器未监听外网端口"
    fi
}

# 查看日志
show_logs() {
    log_info "显示应用日志..."
    
    if [ "$2" = "error" ]; then
        pm2 logs $BACKEND_APP_NAME --err --lines 50
    elif [ "$2" = "out" ]; then
        pm2 logs $BACKEND_APP_NAME --out --lines 50
    else
        pm2 logs $BACKEND_APP_NAME --lines 50
    fi
}

# 完整部署
deploy() {
    log_info "开始完整部署..."
    
    check_environment
    install_dependencies
    build_frontend
    start_services
    
    log_success "部署完成！"
    log_info "项目已成功部署到服务器"
    log_info "访问地址: http://localhost:5000"
}

# 检查外网访问配置
check_external_access() {
    log_info "检查外网访问配置..."
    
    EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "未知")
    echo "外网IP: $EXTERNAL_IP"
    
    # 检查服务器监听状态
    if netstat -tlnp | grep "0.0.0.0:5000" > /dev/null; then
        log_success "✓ 服务器已监听外网端口 (0.0.0.0:5000)"
    else
        log_error "✗ 服务器未监听外网端口"
        echo "请检查服务是否已启动: ./manage.sh status"
        return 1
    fi
    
    # 检查本地防火墙
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            if ufw status | grep -q "5000"; then
                log_success "✓ UFW防火墙已开放5000端口"
            else
                log_warning "! UFW防火墙可能阻止5000端口访问"
                echo "建议执行: sudo ufw allow 5000"
            fi
        else
            log_success "✓ UFW防火墙未激活"
        fi
    fi
    
    # 测试外网连通性
    echo ""
    log_info "测试外网连通性..."
    if timeout 10 curl -I http://$EXTERNAL_IP:5000 >/dev/null 2>&1; then
        log_success "✓ 外网访问测试通过"
        echo ""
        echo "🎉 外网访问配置成功！"
        echo "📱 访问地址: http://$EXTERNAL_IP:5000"
    else
        log_error "✗ 外网访问测试失败"
        echo ""
        echo "🔧 需要配置云服务器安全组规则："
        echo ""
        echo "【阿里云ECS用户】"
        echo "1. 登录阿里云控制台"
        echo "2. 进入ECS管理页面"
        echo "3. 找到您的实例，点击'更多' -> '网络和安全组' -> '安全组配置'"
        echo "4. 点击'配置规则' -> '手动添加'"
        echo "5. 添加入方向规则："
        echo "   - 协议类型: TCP"
        echo "   - 端口范围: 5000/5000"
        echo "   - 源IP: 0.0.0.0/0"
        echo "   - 描述: AI访谈机器人服务"
        echo ""
        echo "【腾讯云CVM用户】"
        echo "1. 登录腾讯云控制台"
        echo "2. 进入云服务器页面"
        echo "3. 点击实例ID进入详情页"
        echo "4. 点击'安全组'标签 -> '编辑规则'"
        echo "5. 添加入站规则："
        echo "   - 类型: 自定义TCP"
        echo "   - 端口范围: 5000"
        echo "   - 源IP: 0.0.0.0/0"
        echo ""
        echo "配置完成后，请等待1-2分钟生效，然后重新测试："
        echo "./manage.sh external"
    fi
}

# 主逻辑
case "$1" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs $@
        ;;
    "build")
        build_frontend
        ;;
    "deploy")
        deploy
        ;;
    "install")
        install_dependencies
        ;;
    "external")
        check_external_access
        ;;
    *)
        echo "AI访谈机器人项目管理脚本"
        echo ""
        echo "使用方法:"
        echo "  ./manage.sh start     - 启动所有服务"
        echo "  ./manage.sh stop      - 停止所有服务"
        echo "  ./manage.sh restart   - 重启所有服务"
        echo "  ./manage.sh status    - 查看服务状态"
        echo "  ./manage.sh logs      - 查看应用日志"
        echo "  ./manage.sh build     - 构建前端应用"
        echo "  ./manage.sh install   - 安装依赖"
        echo "  ./manage.sh deploy    - 完整部署项目"
        echo "  ./manage.sh external  - 检查外网访问配置"
        echo ""
        echo "示例:"
        echo "  ./manage.sh deploy    # 首次部署"
        echo "  ./manage.sh external  # 配置外网访问"
        echo "  ./manage.sh restart   # 重启服务"
        echo "  ./manage.sh logs error # 查看错误日志"
        ;;
esac 