#!/bin/bash

echo "🔐 配置SSL证书（使用自定义端口避免冲突）..."

# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 检查是否已有证书
if [ ! -f /etc/nginx/ssl/selfsigned.crt ]; then
    echo "生成自签名SSL证书..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/selfsigned.key \
        -out /etc/nginx/ssl/selfsigned.crt \
        -subj "/C=CN/ST=State/L=City/O=Organization/CN=121.41.25.186"
fi

# 创建Nginx配置（使用8443端口避免冲突）
sudo tee /etc/nginx/sites-available/ai-interview-ssl-custom << 'NGINX_EOF'
server {
    listen 8443 ssl;
    server_name 121.41.25.186;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

# 可选：在8080端口提供HTTP访问，自动重定向到HTTPS
server {
    listen 8080;
    server_name 121.41.25.186;
    return 301 https://$server_name:8443$request_uri;
}
NGINX_EOF

# 删除可能存在的默认配置
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/ai-interview-ssl

# 启用新站点
sudo ln -sf /etc/nginx/sites-available/ai-interview-ssl-custom /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启nginx
sudo systemctl restart nginx

echo ""
echo "✅ SSL配置完成！"
echo ""
echo "🌐 访问地址："
echo "   HTTPS: https://121.41.25.186:8443"
echo "   HTTP:  http://121.41.25.186:8080 (会自动跳转到HTTPS)"
echo ""
echo "⚠️ 注意事项："
echo "1. 浏览器会显示安全警告（自签名证书），点击"高级"→"继续访问"即可"
echo "2. 使用HTTPS访问后，语音识别功能将正常工作"
echo "3. 请确保防火墙开放了8443和8080端口"
echo ""
echo "🔥 防火墙配置（如需要）："
echo "   sudo ufw allow 8443/tcp"
echo "   sudo ufw allow 8080/tcp" 