#!/bin/bash

echo "🔐 设置HTTPS隧道以支持语音识别功能"
echo "================================================"
echo ""

# 检查是否安装了ngrok
if command -v ngrok &> /dev/null; then
    echo "✅ 检测到ngrok已安装"
    echo ""
    echo "启动ngrok隧道..."
    echo "运行命令: ngrok http 5000"
    echo ""
    echo "请在新终端窗口运行上述命令，然后使用ngrok提供的HTTPS URL访问应用"
    echo "例如: https://xxxx-xxx-xxx-xxx.ngrok.io"
    echo ""
else
    echo "❌ 未检测到ngrok"
    echo ""
    echo "选项1: 安装ngrok（推荐）"
    echo "  1. 访问 https://ngrok.com/download"
    echo "  2. 下载并解压ngrok"
    echo "  3. 运行: ./ngrok http 5000"
    echo ""
fi

# 检查是否可以使用localtunnel
echo "选项2: 使用localtunnel（无需安装）"
echo "  运行: npx localtunnel --port 5000"
echo ""

echo "选项3: 使用localhost访问"
echo "  直接访问: http://localhost:5000"
echo "  注意: localhost通常被视为安全上下文，语音识别应该可以工作"
echo ""

echo "================================================"
echo "⚠️  重要提示："
echo "1. 语音识别API需要HTTPS或localhost环境才能正常工作"
echo "2. 使用IP地址访问（如 http://121.41.25.186:5000）会导致语音功能受限"
echo "3. 推荐使用上述任一方法来确保语音识别正常工作"
echo ""

# 提供快速启动命令
echo "快速启动命令："
echo ""
echo "# 方法1 - 使用ngrok（如果已安装）："
echo "ngrok http 5000"
echo ""
echo "# 方法2 - 使用localtunnel："
echo "npx localtunnel --port 5000"
echo ""
echo "# 方法3 - 本地访问："
echo "直接在浏览器中访问 http://localhost:5000"
echo ""

# 创建一个本地测试脚本
cat > test_speech_localhost.sh << 'EOF'
#!/bin/bash
echo "🎤 正在启动本地语音识别测试..."
echo "浏览器将自动打开 http://localhost:5000"
echo ""

# 检测操作系统并打开浏览器
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5000
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5000
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    start http://localhost:5000
else
    echo "请手动在浏览器中打开: http://localhost:5000"
fi
EOF

chmod +x test_speech_localhost.sh

echo "✅ 已创建本地测试脚本: ./test_speech_localhost.sh"
echo ""
echo "运行 ./test_speech_localhost.sh 来快速测试语音功能" 