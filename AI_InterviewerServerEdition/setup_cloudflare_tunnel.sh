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
