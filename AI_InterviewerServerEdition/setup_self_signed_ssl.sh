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
