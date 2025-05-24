#!/bin/bash

# 项目启动脚本
# 用法: ./start_project.sh

echo "🚀 开始启动智能访谈应用..."

# 设置项目根目录（脚本所在目录）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 项目目录: $PROJECT_ROOT"

# 创建日志目录（提前创建）
mkdir -p "$PROJECT_ROOT/logs"

# 1. 启动 MongoDB
echo "🗃️  启动 MongoDB 服务..."
echo "Rxy@20050607" | sudo -S systemctl start mongod 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MongoDB 启动成功"
    echo "Rxy@20050607" | sudo -S systemctl enable mongod 2>/dev/null
    echo "✅ MongoDB 已设置为开机自启"
else
    echo "❌ MongoDB 启动失败，请检查安装状态"
    exit 1
fi

# 等待 MongoDB 完全启动
echo "⏳ 等待 MongoDB 完全启动..."
sleep 3

# 2. 启动后端服务器
echo "🔧 启动后端服务器..."
cd "$PROJECT_ROOT/backend"
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 在后台启动后端
echo "🚀 后端服务器启动中..."
nohup node app.js > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/backend.pid"
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID)"
echo "📋 后端日志: $PROJECT_ROOT/logs/backend.log"

# 等待后端启动
sleep 5

# 检查后端是否正常启动
if curl -s http://localhost:5000/api/topics > /dev/null 2>&1; then
    echo "✅ 后端 API 响应正常"
else
    echo "⚠️  后端 API 可能还在启动中或存在问题，请检查日志"
fi

# 3. 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    pnpm install
fi

echo "🚀 前端开发服务器启动中..."
nohup pnpm run serve > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/frontend.pid"
echo "✅ 前端开发服务器已启动 (PID: $FRONTEND_PID)"
echo "📋 前端日志: $PROJECT_ROOT/logs/frontend.log"

echo ""
echo "🎉 项目启动完成！"
echo ""
echo "📊 服务状态:"
echo "   🗃️  MongoDB:     systemctl status mongod"
echo "   🔧 后端服务器:   http://localhost:5000"
echo "   🎨 前端应用:     http://localhost:8080 (或 8081)"
echo ""
echo "📋 日志文件:"
echo "   后端: $PROJECT_ROOT/logs/backend.log"
echo "   前端: $PROJECT_ROOT/logs/frontend.log"
echo ""
echo "🛑 停止项目: ./stop_project.sh"
echo ""
echo "⏰ 等待前端完全启动后在浏览器中访问应用..." 