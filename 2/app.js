// 后端入口文件
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // 引入 path 模块

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 提供 public 文件夹中的静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 根路径请求处理 - 发送欢迎页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API路由
app.use('/api/topics', require('./topics'));
app.use('/api/interviews', require('./interviews'));
app.use('/api/summaries', require('./summaries'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
