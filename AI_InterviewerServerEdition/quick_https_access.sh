#!/bin/bash

echo "🚀 快速HTTPS访问解决方案"
echo "========================="
echo ""
echo "选择最适合您的方案："
echo ""

# 方案1：使用SSH端口转发（立即可用）
echo "📌 方案1：SSH端口转发（立即可用，无需服务器配置）"
echo "在您的本地电脑运行："
echo ""
echo "ssh -L 5000:localhost:5000 root@121.41.25.186"
echo ""
echo "然后在本地浏览器访问: http://localhost:5000"
echo "--------------------------------------------------------"
echo ""

# 方案2：使用serveo（最快的公共HTTPS）
echo "📌 方案2：Serveo隧道（无需注册，立即获得HTTPS）"
echo "在服务器上运行："
echo ""
echo "ssh -R 80:localhost:5000 serveo.net"
echo ""
echo "您将获得一个HTTPS URL用于访问"
echo "--------------------------------------------------------"
echo ""

# 方案3：使用localtunnel
echo "📌 方案3：Localtunnel（简单快速）"
echo "安装并运行："
echo ""
echo "npm install -g localtunnel"
echo "lt --port 5000"
echo ""
echo "您将获得一个HTTPS URL"
echo "--------------------------------------------------------"
echo ""

# 创建一键启动脚本
cat > start_https_tunnel.sh << 'EOF'
#!/bin/bash

echo "🚀 一键启动HTTPS隧道"
echo "===================="
echo ""
echo "请选择方案："
echo "1) Serveo (最快，无需安装)"
echo "2) Localtunnel (需要npm)"
echo "3) Ngrok (需要注册)"
echo ""
read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "启动Serveo隧道..."
        ssh -R 80:localhost:5000 serveo.net
        ;;
    2)
        echo "启动Localtunnel..."
        if ! command -v lt &> /dev/null; then
            echo "安装localtunnel..."
            npm install -g localtunnel
        fi
        lt --port 5000
        ;;
    3)
        echo "启动Ngrok..."
        if ! command -v ngrok &> /dev/null; then
            echo "请先安装ngrok: ./start_ngrok.sh"
            exit 1
        fi
        ngrok http 5000
        ;;
    *)
        echo "无效选择"
        ;;
esac
EOF

chmod +x start_https_tunnel.sh

echo ""
echo "✅ 已创建一键启动脚本: ./start_https_tunnel.sh"
echo ""
echo "🎯 最快速的方法："
echo "运行: ssh -R 80:localhost:5000 serveo.net"
echo "立即获得HTTPS访问！" 