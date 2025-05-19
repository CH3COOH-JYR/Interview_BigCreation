# AI自主访谈系统 - 本地运行和部署指南

本文档提供了AI自主访谈系统的本地运行测试和服务器部署的详细指南。系统采用前后端分离架构，包含四个主要模块：问题收集端（管理员端）、回答端（用户端）、后端API服务和模型服务。

## 目录

1. [系统架构概述](#系统架构概述)
2. [环境要求](#环境要求)
3. [本地运行测试](#本地运行测试)
   - [MongoDB安装与配置](#mongodb安装与配置)
   - [后端API服务启动](#后端api服务启动)
   - [模型服务启动](#模型服务启动)
   - [管理员端（问题收集端）启动](#管理员端问题收集端启动)
   - [用户端（回答端）启动](#用户端回答端启动)
4. [服务器部署](#服务器部署)
   - [MongoDB部署](#mongodb部署)
   - [后端API服务部署](#后端api服务部署)
   - [模型服务部署](#模型服务部署)
   - [前端站点部署](#前端站点部署)
5. [环境变量配置](#环境变量配置)
6. [常见问题与解决方案](#常见问题与解决方案)

## 系统架构概述

AI自主访谈系统采用前后端分离的架构，包含以下四个主要模块：

1. **管理员端（问题收集端）**：基于Vue.js的前端应用，用于创建和管理访谈主题、查看访谈记录和总结。
2. **用户端（回答端）**：基于Vue.js的前端应用，用于浏览访谈主题、参与访谈和查看总结。
3. **后端API服务**：基于Node.js/Express的后端服务，提供RESTful API，处理业务逻辑和数据存储。
4. **模型服务**：独立的推理服务，负责访谈逻辑推理、问题生成和总结生成。

数据存储使用MongoDB，所有数据流通过后端API和数据库完成，不再使用本地JSON文件。

## 环境要求

### 开发环境

- Node.js 14.x 或更高版本
- npm 6.x 或更高版本
- MongoDB 4.4 或更高版本
- 现代浏览器（Chrome、Firefox、Safari、Edge等）

### 生产环境

- Linux服务器（推荐Ubuntu 20.04 LTS或更高版本）
- Node.js 14.x 或更高版本
- MongoDB 4.4 或更高版本
- Nginx（用于前端部署和反向代理）
- PM2（用于Node.js应用进程管理）

## 本地运行测试

### MongoDB安装与配置

1. **安装MongoDB**

   根据您的操作系统，按照[MongoDB官方文档](https://docs.mongodb.com/manual/installation/)安装MongoDB。

   Ubuntu示例：
   ```bash
   # 导入公钥
   wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
   
   # 添加MongoDB源
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
   
   # 更新包数据库
   sudo apt-get update
   
   # 安装MongoDB
   sudo apt-get install -y mongodb-org
   
   # 启动MongoDB服务
   sudo systemctl start mongod
   
   # 设置开机自启
   sudo systemctl enable mongod
   ```

2. **创建数据库和用户**

   ```bash
   # 连接到MongoDB
   mongo
   
   # 创建数据库
   use interview_system
   
   # 创建用户（生产环境必须）
   db.createUser({
     user: "interview_admin",
     pwd: "your_secure_password",
     roles: [{ role: "readWrite", db: "interview_system" }]
   })
   
   # 退出
   exit
   ```

### 后端API服务启动

1. **安装依赖**

   ```bash
   cd /path/to/dual-interview-system/backend
   npm install
   ```

2. **配置环境变量**

   创建`.env`文件：
   ```bash
   touch .env
   ```

   编辑`.env`文件，添加以下内容：
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/interview_system
   MODEL_SERVICE_URL=http://localhost:5001/api
   NODE_ENV=development
   ```

   如果您在MongoDB中创建了用户，请使用以下连接字符串：
   ```
   MONGODB_URI=mongodb://interview_admin:your_secure_password@localhost:27017/interview_system
   ```

3. **启动服务**

   ```bash
   # 开发模式启动
   npm run dev
   
   # 或者生产模式启动
   npm start
   ```

   服务将在`http://localhost:5000`上运行。

### 模型服务启动

1. **安装依赖**

   ```bash
   cd /path/to/dual-interview-system/model-service
   npm install
   ```

2. **配置环境变量**

   创建`.env`文件：
   ```bash
   touch .env
   ```

   编辑`.env`文件，添加以下内容：
   ```
   PORT=5001
   VLLM_API_URL=http://localhost:8000/v1
   NODE_ENV=development
   ```

3. **启动服务**

   ```bash
   # 开发模式启动
   npm run dev
   
   # 或者生产模式启动
   npm start
   ```

   服务将在`http://localhost:5001`上运行。

### 管理员端（问题收集端）启动

1. **安装依赖**

   ```bash
   cd /path/to/dual-interview-system/admin-frontend
   npm install
   ```

2. **配置环境变量**

   创建`.env`文件：
   ```bash
   touch .env
   ```

   编辑`.env`文件，添加以下内容：
   ```
   VUE_APP_API_URL=http://localhost:5000/api/admin
   ```

3. **启动开发服务器**

   ```bash
   npm run serve
   ```

   管理员端将在`http://localhost:8080`上运行。

### 用户端（回答端）启动

1. **安装依赖**

   ```bash
   cd /path/to/dual-interview-system/user-frontend
   npm install
   ```

2. **配置环境变量**

   创建`.env`文件：
   ```bash
   touch .env
   ```

   编辑`.env`文件，添加以下内容：
   ```
   VUE_APP_API_URL=http://localhost:5000/api
   ```

3. **启动开发服务器**

   ```bash
   npm run serve
   ```

   用户端将在`http://localhost:8081`上运行（如果8080端口已被管理员端占用）。

## 服务器部署

### MongoDB部署

1. **安装MongoDB**

   按照[MongoDB官方文档](https://docs.mongodb.com/manual/installation/)在服务器上安装MongoDB。

2. **安全配置**

   编辑MongoDB配置文件（通常在`/etc/mongod.conf`）：
   ```yaml
   security:
     authorization: enabled
   
   net:
     bindIp: 127.0.0.1  # 只允许本地连接，通过应用服务器访问
   ```

3. **创建数据库和用户**

   ```bash
   # 连接到MongoDB
   mongo
   
   # 创建数据库
   use interview_system
   
   # 创建用户
   db.createUser({
     user: "interview_admin",
     pwd: "your_secure_password",
     roles: [{ role: "readWrite", db: "interview_system" }]
   })
   
   # 退出
   exit
   ```

4. **重启MongoDB服务**

   ```bash
   sudo systemctl restart mongod
   ```

### 后端API服务部署

1. **安装Node.js和PM2**

   ```bash
   # 安装Node.js
   curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装PM2
   sudo npm install -g pm2
   ```

2. **部署代码**

   ```bash
   # 克隆或上传代码到服务器
   git clone <repository_url>
   cd /path/to/dual-interview-system/backend
   
   # 安装依赖
   npm install --production
   ```

3. **配置环境变量**

   创建`.env`文件：
   ```
   PORT=5000
   MONGODB_URI=mongodb://interview_admin:your_secure_password@localhost:27017/interview_system
   MODEL_SERVICE_URL=http://localhost:5001/api
   NODE_ENV=production
   ```

4. **使用PM2启动服务**

   ```bash
   pm2 start src/app.js --name "interview-backend"
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

### 模型服务部署

1. **部署代码**

   ```bash
   # 克隆或上传代码到服务器
   cd /path/to/dual-interview-system/model-service
   
   # 安装依赖
   npm install --production
   ```

2. **配置环境变量**

   创建`.env`文件：
   ```
   PORT=5001
   VLLM_API_URL=http://localhost:8000/v1
   NODE_ENV=production
   ```

3. **使用PM2启动服务**

   ```bash
   pm2 start src/app.js --name "interview-model-service"
   
   # 设置开机自启
   pm2 save
   ```

### 前端站点部署

1. **构建前端应用**

   管理员端：
   ```bash
   cd /path/to/dual-interview-system/admin-frontend
   
   # 配置生产环境API地址
   echo "VUE_APP_API_URL=https://your-api-domain.com/api/admin" > .env.production
   
   # 构建
   npm run build
   ```

   用户端：
   ```bash
   cd /path/to/dual-interview-system/user-frontend
   
   # 配置生产环境API地址
   echo "VUE_APP_API_URL=https://your-api-domain.com/api" > .env.production
   
   # 构建
   npm run build
   ```

2. **配置Nginx**

   安装Nginx：
   ```bash
   sudo apt-get install nginx
   ```

   创建管理员端配置文件：
   ```bash
   sudo nano /etc/nginx/sites-available/admin.interview-system.com
   ```

   添加以下内容：
   ```nginx
   server {
       listen 80;
       server_name admin.interview-system.com;
       
       root /path/to/dual-interview-system/admin-frontend/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 反向代理API请求
       location /api/ {
           proxy_pass http://localhost:5000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   创建用户端配置文件：
   ```bash
   sudo nano /etc/nginx/sites-available/interview-system.com
   ```

   添加以下内容：
   ```nginx
   server {
       listen 80;
       server_name interview-system.com;
       
       root /path/to/dual-interview-system/user-frontend/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 反向代理API请求
       location /api/ {
           proxy_pass http://localhost:5000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **启用站点配置**

   ```bash
   sudo ln -s /etc/nginx/sites-available/admin.interview-system.com /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/interview-system.com /etc/nginx/sites-enabled/
   
   # 测试配置
   sudo nginx -t
   
   # 重启Nginx
   sudo systemctl restart nginx
   ```

4. **配置HTTPS（推荐）**

   使用Let's Encrypt配置HTTPS：
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d admin.interview-system.com -d interview-system.com
   ```

## 环境变量配置

### 后端API服务

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| PORT | 服务端口 | 5000 |
| MONGODB_URI | MongoDB连接字符串 | mongodb://user:password@localhost:27017/interview_system |
| MODEL_SERVICE_URL | 模型服务URL | http://localhost:5001/api |
| NODE_ENV | 环境模式 | development, production |

### 模型服务

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| PORT | 服务端口 | 5001 |
| VLLM_API_URL | vLLM API地址 | http://localhost:8000/v1 |
| NODE_ENV | 环境模式 | development, production |

### 管理员端（问题收集端）

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| VUE_APP_API_URL | 后端API地址 | http://localhost:5000/api/admin |

### 用户端（回答端）

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| VUE_APP_API_URL | 后端API地址 | http://localhost:5000/api |

## 常见问题与解决方案

### 1. MongoDB连接失败

**问题**：后端服务无法连接到MongoDB数据库。

**解决方案**：
- 确认MongoDB服务正在运行：`sudo systemctl status mongod`
- 检查连接字符串是否正确
- 确认MongoDB用户权限配置正确
- 检查防火墙设置是否允许MongoDB端口（默认27017）

### 2. 前端无法连接到后端API

**问题**：前端应用无法连接到后端API服务。

**解决方案**：
- 确认后端服务正在运行
- 检查API URL配置是否正确
- 检查CORS设置是否正确
- 在浏览器开发者工具中查看网络请求错误

### 3. 模型服务连接失败

**问题**：后端无法连接到模型服务。

**解决方案**：
- 确认模型服务正在运行
- 检查模型服务URL配置是否正确
- 确认vLLM服务已正确配置并运行

### 4. 部署后路由问题

**问题**：部署后刷新页面出现404错误。

**解决方案**：
- 确认Nginx配置中包含了`try_files $uri $uri/ /index.html;`
- 检查Vue Router是否使用了正确的history模式
- 重启Nginx服务：`sudo systemctl restart nginx`

### 5. PM2进程崩溃

**问题**：PM2管理的Node.js进程频繁崩溃。

**解决方案**：
- 检查日志：`pm2 logs`
- 增加内存限制：`pm2 start src/app.js --name "interview-backend" --max-memory-restart 1G`
- 检查代码中的错误处理和异常捕获
