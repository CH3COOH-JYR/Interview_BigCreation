// 后端入口文件
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // 引入 path 模块
const connectDB = require('./db'); // 引入数据库连接函数

// 加载环境变量
dotenv.config();

// 连接数据库
connectDB();

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// API路由
app.use('/api/topics', require('./topics'));
app.use('/api/interviews', require('./interviews'));
app.use('/api/summaries', require('./summaries'));

// ---- 服务前端静态文件 ----
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// 对于所有其他GET请求 (非API, 非静态文件)，都发送 Vue app 的 index.html
// 这需要放在 API 路由和静态文件服务之后
app.get(/^(?!\/api).*$/, (req, res) => { // 正则表达式确保不捕获 /api 开头的路径
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 启动服务器
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Server URL: http://${HOST}:${PORT}`);
  console.log(`External URL: http://121.41.25.186:${PORT}`);
});

module.exports = app;
