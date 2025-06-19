#!/bin/bash

echo "🔐 配置SSL证书以支持HTTPS访问"
echo "========================================"
echo ""

# 检查是否安装了nginx
if ! command -v nginx &> /dev/null; then
    echo "📥 安装Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# 检查是否安装了certbot
if ! command -v certbot &> /dev/null; then
    echo "📥 安装Certbot（Let's Encrypt客户端）..."
    sudo apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo "🔧 配置选项："
echo ""
echo "1. 使用Let's Encrypt免费SSL证书（需要域名）"
echo "2. 使用自签名证书（会有浏览器警告，但可以工作）"
echo "3. 使用Cloudflare Tunnel（免费，无需域名）"
echo ""

# 创建自签名证书脚本
cat > setup_self_signed_ssl.sh << 'EOF'
#!/bin/bash

echo "🔐 创建自签名SSL证书..."

# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=CN/ST=State/L=City/O=Organization/CN=121.41.25.186"

# 创建Nginx配置
sudo tee /etc/nginx/sites-available/ai-interview-ssl << 'NGINX_EOF'
server {
    listen 443 ssl;
    server_name 121.41.25.186;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name 121.41.25.186;
    return 301 https://$server_name$request_uri;
}
NGINX_EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/ai-interview-ssl /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ 自签名SSL证书配置完成！"
echo ""
echo "访问: https://121.41.25.186"
echo ""
echo "⚠️ 注意：浏览器会显示安全警告，点击"高级"然后"继续访问"即可"
EOF

chmod +x setup_self_signed_ssl.sh

# 创建Cloudflare Tunnel脚本
cat > setup_cloudflare_tunnel.sh << 'EOF'
#!/bin/bash

echo "🌐 配置Cloudflare Tunnel（推荐）"
echo "================================"
echo ""
echo "Cloudflare Tunnel提供免费的HTTPS访问，无需域名和证书"
echo ""

# 安装cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📥 安装cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

echo "🚀 启动Cloudflare Tunnel..."
echo ""
echo "运行以下命令创建隧道："
echo "cloudflared tunnel --url http://localhost:5000"
echo ""
echo "您将获得一个HTTPS URL，例如："
echo "https://xxxxx.trycloudflare.com"
echo ""
echo "使用该URL即可安全访问您的应用，语音识别功能将正常工作！"
EOF

chmod +x setup_cloudflare_tunnel.sh

echo ""
echo "✅ SSL配置脚本已创建！"
echo ""
echo "请选择一种方式："
echo ""
echo "1. 自签名证书（最快）:"
echo "   ./setup_self_signed_ssl.sh"
echo ""
echo "2. Cloudflare Tunnel（推荐）:"
echo "   ./setup_cloudflare_tunnel.sh"
echo ""
echo "3. Let's Encrypt（需要域名）:"
echo "   sudo certbot --nginx -d yourdomain.com" 