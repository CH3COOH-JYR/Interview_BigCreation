#!/bin/bash

echo "🚀 自动配置HTTPS隧道用于语音识别"
echo "========================================"

# 检查是否已安装ngrok
if ! command -v ngrok &> /dev/null; then
    echo "📥 正在安装ngrok..."
    
    # 下载ngrok
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
    tar -xzf ngrok-v3-stable-linux-amd64.tgz
    rm ngrok-v3-stable-linux-amd64.tgz
    
    # 移动到系统路径
    sudo mv ngrok /usr/local/bin/
    
    echo "✅ ngrok安装完成"
else
    echo "✅ ngrok已安装"
fi

echo ""
echo "🌐 启动HTTPS隧道..."
echo ""
echo "注意：首次使用需要注册ngrok账号（免费）"
echo "1. 访问 https://ngrok.com 注册账号"
echo "2. 获取您的authtoken"
echo "3. 运行: ngrok config add-authtoken YOUR_TOKEN"
echo ""
echo "然后运行以下命令："
echo "ngrok http 5000"
echo ""
echo "您将获得一个HTTPS URL，例如："
echo "https://xxxx-xxx-xxx-xxx.ngrok-free.app"
echo ""
echo "使用该HTTPS URL即可正常使用语音识别功能！"

# 提供快速启动命令
cat > start_ngrok_tunnel.sh << 'EOF'
#!/bin/bash
echo "🚀 启动ngrok HTTPS隧道..."
ngrok http 5000
EOF

chmod +x start_ngrok_tunnel.sh

echo ""
echo "✅ 已创建快速启动脚本: ./start_ngrok_tunnel.sh" 