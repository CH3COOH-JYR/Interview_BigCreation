# HTTPS配置更新说明

## 更新时间
2025年6月19日

## 背景
- 原先项目同时运行HTTP版本（5000端口）和HTTPS版本（8443端口）
- 服务器安全组只开放了5000端口的外网访问
- 语音识别功能需要HTTPS才能正常工作
- 同时运行两个版本浪费服务器资源

## 解决方案
将HTTPS服务迁移到5000端口，停止HTTP服务，只保留HTTPS版本。

## 配置变更
1. **Nginx配置** (`/etc/nginx/sites-available/ai-interview-ssl-custom`)
   - 监听端口从8443改为5000
   - 反向代理目标从5000改为5001

2. **Node.js应用配置** (`ecosystem.config.js`)
   - 端口从5000改为5001
   - HOST从'0.0.0.0'改为'localhost'（只在本地监听，通过nginx提供外网访问）

3. **管理脚本** (`manage.sh`)
   - 更新了提示信息，明确说明HTTPS访问地址
   - 更新了端口检查逻辑

## 访问方式
- **外网访问**: https://121.41.25.186:5000 （支持语音识别）
- **本地调试**: http://localhost:5001

## 注意事项
1. 使用的是自签名SSL证书，浏览器会显示安全警告，需要手动信任证书
2. 外网访问必须使用HTTPS协议，否则语音识别功能无法工作
3. manage.sh脚本仍然正常工作，无需改变使用方式

## 管理命令
```bash
# 启动服务
./manage.sh start

# 停止服务
./manage.sh stop

# 重启服务
./manage.sh restart

# 查看状态
./manage.sh status

# 查看日志
./manage.sh logs
```

## 架构示意图
```
Internet → 5000端口(HTTPS/nginx) → 5001端口(HTTP/Node.js) → MongoDB
                ↓
           SSL加密通信
           支持语音识别
``` 