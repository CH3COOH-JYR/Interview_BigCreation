#!/bin/bash

# 项目停止脚本
# 用法: ./stop_project.sh

echo "🛑 正在停止智能访谈应用..."

# 设置项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 项目目录: $PROJECT_ROOT"

# 1. 停止前端开发服务器
echo "🎨 停止前端开发服务器..."
if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/logs/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo "✅ 前端开发服务器已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端进程已不存在"
    fi
    rm -f "$PROJECT_ROOT/logs/frontend.pid"
else
    echo "⚠️  未找到前端 PID 文件，尝试通过端口杀死进程..."
    # 尝试通过端口杀死进程
    lsof -ti:8080 | xargs kill -9 2>/dev/null
    lsof -ti:8081 | xargs kill -9 2>/dev/null
fi

# 2. 停止后端服务器
echo "🔧 停止后端服务器..."
if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/logs/backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo "✅ 后端服务器已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端进程已不存在"
    fi
    rm -f "$PROJECT_ROOT/logs/backend.pid"
else
    echo "⚠️  未找到后端 PID 文件，尝试通过端口杀死进程..."
    # 尝试通过端口杀死进程
    lsof -ti:5000 | xargs kill -9 2>/dev/null
fi

# 3. 可选：停止 MongoDB（注释掉，因为可能影响其他应用）
# echo "🗃️  停止 MongoDB 服务..."
# echo "111111" | sudo -S systemctl stop mongod 2>/dev/null
# echo "✅ MongoDB 已停止"

echo ""
echo "✅ 项目已停止！"
echo ""
echo "💡 注意："
echo "   🗃️  MongoDB 服务仍在运行（可能被其他应用使用）"
echo "   📋 日志文件保留在 $PROJECT_ROOT/logs/ 目录"
echo ""
echo "🚀 重新启动项目: ./start_project.sh" 