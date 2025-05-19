# 双端分离的AI自主访谈系统 - 重新设计方案

## 现有系统分析

在之前的重构中，我们已经将系统从Streamlit单体应用改造为前后端分离的架构，但仍有以下问题需要解决：

1. 系统仍然是单一网站，而非用户要求的两个独立网站（问题收集端和回答问题端）
2. 部分逻辑仍然依赖于JSON文件存储，而非完全使用MongoDB
3. 缺少详细的本地运行和部署指南

## 新架构设计

根据用户需求，我们将系统重新设计为两个完全独立的网站：

### 1. 问题收集端（发布端）
- 功能：创建访谈主题、设置关键问题、查看访谈总结
- 技术栈：Vue.js前端 + Node.js后端 + MongoDB数据库
- 用户角色：访谈发布者（管理员）

### 2. 回答问题端（用户端）
- 功能：浏览访谈主题、参与访谈、回答问题
- 技术栈：Vue.js前端 + Node.js后端 + MongoDB数据库
- 用户角色：访谈参与者（普通用户）

### 3. 共享后端服务
- 功能：提供API接口、处理数据存储、调用模型服务
- 技术栈：Node.js + Express + MongoDB
- 服务内容：主题管理、访谈流程、数据存储、模型调用

### 4. 模型服务
- 功能：提供AI推理能力、生成问题和总结
- 技术栈：Node.js + vLLM
- 服务内容：文本生成、回答分析、访谈总结

## 数据库设计

完全使用MongoDB替代JSON文件存储，设计以下集合：

### 1. topics 集合
```javascript
{
  _id: ObjectId,
  title: String,          // 访谈主题标题
  outline: String,        // 访谈大纲
  keyQuestions: [String], // 关键问题列表
  status: String,         // 'active', 'inactive'
  createdBy: String,      // 创建者ID或名称
  createdAt: Date,
  updatedAt: Date
}
```

### 2. interviews 集合
```javascript
{
  _id: ObjectId,
  topicId: ObjectId,      // 关联的主题ID
  participantId: String,  // 参与者ID或名称
  status: String,         // 'in-progress', 'completed'
  currentQuestionIndex: Number,
  dialogHistory: [{
    role: String,         // 'interviewer', 'interviewee'
    content: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 3. summaries 集合
```javascript
{
  _id: ObjectId,
  interviewId: ObjectId,  // 关联的访谈ID
  takeaways: String,      // 主要结论
  points: [Number],       // 评分列表
  explanations: [String], // 评分解释
  createdAt: Date
}
```

### 4. users 集合（可选，用于身份验证）
```javascript
{
  _id: ObjectId,
  username: String,
  password: String,       // 加密存储
  role: String,           // 'admin', 'user'
  createdAt: Date
}
```

## API设计

### 问题收集端（发布端）API

1. **主题管理**
   - `GET /api/admin/topics` - 获取所有主题
   - `POST /api/admin/topics` - 创建新主题
   - `GET /api/admin/topics/:id` - 获取特定主题详情
   - `PUT /api/admin/topics/:id` - 更新主题
   - `DELETE /api/admin/topics/:id` - 删除主题

2. **访谈管理**
   - `GET /api/admin/interviews` - 获取所有访谈记录
   - `GET /api/admin/interviews/:id` - 获取特定访谈详情
   - `DELETE /api/admin/interviews/:id` - 删除访谈记录

3. **总结管理**
   - `GET /api/admin/summaries` - 获取所有总结
   - `GET /api/admin/summaries/:id` - 获取特定总结详情
   - `DELETE /api/admin/summaries/:id` - 删除总结

### 回答问题端（用户端）API

1. **主题浏览**
   - `GET /api/topics` - 获取活跃的主题列表
   - `GET /api/topics/:id` - 获取特定主题详情

2. **访谈参与**
   - `POST /api/interviews` - 开始新访谈
   - `GET /api/interviews/:id` - 获取访谈状态
   - `POST /api/interviews/:id/response` - 提交回答
   - `POST /api/interviews/:id/next` - 获取下一个问题
   - `POST /api/interviews/:id/end` - 结束访谈

3. **总结查看**
   - `GET /api/summaries/:interviewId` - 获取访谈总结

## 前端页面设计

### 问题收集端（发布端）

1. **登录页面**
   - 管理员登录表单

2. **主题列表页面**
   - 显示所有主题
   - 创建、编辑、删除主题的入口
   - 查看访谈记录和总结的入口

3. **主题创建/编辑页面**
   - 主题标题输入
   - 访谈大纲输入
   - 关键问题添加/删除
   - 保存/取消按钮

4. **访谈记录列表页面**
   - 按主题分组显示访谈记录
   - 查看详情和总结的入口

5. **访谈总结页面**
   - 显示访谈总结内容
   - 显示评分和解释
   - 导出功能

### 回答问题端（用户端）

1. **主题列表页面**
   - 显示活跃的主题列表
   - 开始访谈的入口

2. **访谈页面**
   - 显示当前问题
   - 回答输入框
   - 下一个问题/结束访谈按钮
   - 访谈进度显示

3. **总结页面**
   - 显示访谈总结
   - 返回主页按钮

## 技术实现要点

1. **完全移除Streamlit**
   - 使用Vue.js实现所有前端页面
   - 使用Vue Router进行路由管理
   - 使用Vuex进行状态管理

2. **完全使用MongoDB**
   - 使用Mongoose ODM操作MongoDB
   - 实现数据模型和验证
   - 设计合理的索引提高查询效率

3. **安全性考虑**
   - 实现基本的身份验证
   - 防止未授权访问管理功能
   - 输入验证和防注入

4. **部署考虑**
   - 前端可独立部署到静态服务器
   - 后端和模型服务可部署到Node.js环境
   - 提供Docker配置简化部署
