#!/bin/bash

# 停止 MongoDB 服务脚本
# 用法: ./stop_mongodb.sh

echo "🛑 正在停止 MongoDB 服务..."

# 停止 MongoDB 服务
echo "Rxy@20050607" | sudo -S systemctl stop mongod 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ MongoDB 服务已停止"
    
    # 检查服务状态
    if systemctl is-active --quiet mongod; then
        echo "⚠️  MongoDB 服务可能仍在运行，请手动检查"
    else
        echo "✅ 确认 MongoDB 服务已完全停止"
    fi
else
    echo "❌ 停止 MongoDB 服务失败，可能服务未运行或权限不足"
fi

echo ""
echo "💡 检查 MongoDB 服务状态:"
echo "   sudo systemctl status mongod"
echo ""
echo "🚀 重新启动 MongoDB:"
echo "   sudo systemctl start mongod"
echo "   或运行项目启动脚本: ./start_project.sh" 