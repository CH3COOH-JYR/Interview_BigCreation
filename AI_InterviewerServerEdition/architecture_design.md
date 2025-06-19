# AI自主访谈机器人 - 模块化架构设计

## 整体架构

新的AI自主访谈机器人将采用前后端分离的架构，分为三个主要部分：

1. **前端（Vue.js）**：负责用户界面和交互
2. **后端（Node.js/Express）**：负责业务逻辑和数据处理
3. **模型服务（Node.js封装）**：负责大模型调用和推理

整体架构将遵循以下原则：
- 关注点分离：UI、业务逻辑、数据访问和模型推理各自独立
- 松耦合：各模块通过标准接口通信，减少依赖
- 可扩展：预留多模态分析接口，支持后续功能扩展
- 可伸缩：支持并发访问和多用户场景

## 前端架构（Vue.js）

### 组件结构

```
frontend/
├── public/
├── src/
│   ├── assets/            # 静态资源
│   ├── components/        # 可复用组件
│   │   ├── common/        # 通用组件
│   │   ├── interview/     # 访谈相关组件
│   │   └── summary/       # 总结相关组件
│   ├── views/             # 页面视图
│   │   ├── Home.vue       # 首页（访谈主题列表）
│   │   ├── CreateTopic.vue # 创建访谈主题
│   │   ├── Interview.vue  # 访谈进行页面
│   │   └── Summary.vue    # 访谈总结页面
│   ├── router/            # 路由配置
│   ├── store/             # Vuex状态管理
│   │   ├── modules/       # 状态模块
│   │   │   ├── interview.js # 访谈状态
│   │   │   ├── topics.js  # 主题列表状态
│   │   │   └── user.js    # 用户状态
│   │   └── index.js       # 状态管理入口
│   ├── services/          # API服务
│   │   ├── api.js         # API调用封装
│   │   ├── interview.js   # 访谈相关API
│   │   └── topics.js      # 主题相关API
│   ├── utils/             # 工具函数
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
└── package.json           # 项目配置
```

### 主要页面和功能

1. **首页（Home.vue）**：
   - 显示访谈主题列表
   - 支持筛选和搜索
   - 提供创建新主题的入口

2. **创建主题（CreateTopic.vue）**：
   - 输入访谈大纲
   - 添加关键问题
   - 提交并创建新主题

3. **访谈页面（Interview.vue）**：
   - 显示当前问题
   - 记录用户回答
   - 提供"下一个问题"和"结束访谈"按钮
   - 实时显示访谈进度

4. **总结页面（Summary.vue）**：
   - 显示访谈总结
   - 展示评分和解释
   - 提供导出功能

### 状态管理

使用Vuex管理全局状态，主要包括：
- 访谈主题列表
- 当前访谈状态
- 用户信息
- 访谈历史记录

## 后端架构（Node.js/Express）

### 目录结构

```
backend/
├── src/
│   ├── api/               # API路由
│   │   ├── routes/        # 路由定义
│   │   │   ├── topics.js  # 主题相关路由
│   │   │   ├── interview.js # 访谈相关路由
│   │   │   └── summary.js # 总结相关路由
│   │   └── index.js       # 路由入口
│   ├── controllers/       # 控制器
│   │   ├── topicController.js
│   │   ├── interviewController.js
│   │   └── summaryController.js
│   ├── models/            # 数据模型
│   │   ├── Topic.js       # 主题模型
│   │   ├── Interview.js   # 访谈模型
│   │   └── Summary.js     # 总结模型
│   ├── services/          # 业务服务
│   │   ├── topicService.js
│   │   ├── interviewService.js
│   │   └── summaryService.js
│   ├── utils/             # 工具函数
│   │   ├── logger.js
│   │   └── errorHandler.js
│   ├── middleware/        # 中间件
│   │   ├── auth.js
│   │   └── errorMiddleware.js
│   ├── config/            # 配置文件
│   │   ├── db.js          # 数据库配置
│   │   └── app.js         # 应用配置
│   └── app.js             # 应用入口
└── package.json           # 项目配置
```

### API设计

1. **主题相关API**：
   - `GET /api/topics` - 获取主题列表
   - `POST /api/topics` - 创建新主题
   - `GET /api/topics/:id` - 获取特定主题详情
   - `PUT /api/topics/:id` - 更新主题
   - `DELETE /api/topics/:id` - 删除主题

2. **访谈相关API**：
   - `POST /api/interviews` - 开始新访谈
   - `GET /api/interviews/:id` - 获取访谈状态
   - `POST /api/interviews/:id/response` - 提交用户回答
   - `POST /api/interviews/:id/next` - 获取下一个问题
   - `POST /api/interviews/:id/end` - 结束访谈

3. **总结相关API**：
   - `GET /api/summaries/:interviewId` - 获取访谈总结
   - `POST /api/summaries/:interviewId/export` - 导出总结

### 数据模型

1. **Topic模型**：
   ```javascript
   {
     _id: ObjectId,
     title: String,          // 访谈主题标题
     outline: String,        // 访谈大纲
     keyQuestions: [String], // 关键问题列表
     createdAt: Date,
     updatedAt: Date
   }
   ```

2. **Interview模型**：
   ```javascript
   {
     _id: ObjectId,
     topicId: ObjectId,      // 关联的主题ID
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

3. **Summary模型**：
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

## 模型服务架构

### 目录结构

```
model-service/
├── src/
│   ├── api/               # API接口
│   │   └── index.js       # API路由
│   ├── services/          # 模型服务
│   │   ├── llmService.js  # 大模型服务
│   │   ├── vllmAdapter.js # vLLM适配器
│   │   └── multimodalService.js # 多模态服务（预留）
│   ├── utils/             # 工具函数
│   │   ├── tokenizer.js   # 标准tokenizer
│   │   └── logger.js
│   ├── config/            # 配置文件
│   │   └── models.js      # 模型配置
│   └── app.js             # 应用入口
└── package.json           # 项目配置
```

### API设计

1. **模型推理API**：
   - `POST /api/generate` - 文本生成
   - `POST /api/analyze` - 访谈分析
   - `POST /api/summarize` - 生成总结

2. **多模态分析API（预留）**：
   - `POST /api/facial-analysis` - 面部表情分析
   - `POST /api/voice-analysis` - 声音分析

### vLLM集成

替换当前的DummyTokenizer，使用标准的vLLM接口：

```javascript
// vllmAdapter.js
const { LLM, SamplingParams } = require('vllm');

class VLLMAdapter {
  constructor(modelPath, options = {}) {
    this.llm = new LLM(modelPath, options);
  }

  async generate(prompts, samplingParams) {
    try {
      return await this.llm.generate(prompts, samplingParams);
    } catch (error) {
      console.error('vLLM generation error:', error);
      throw error;
    }
  }
}

module.exports = VLLMAdapter;
```

## 数据库设计（MongoDB）

### 集合设计

1. **topics**：存储访谈主题
2. **interviews**：存储访谈记录
3. **summaries**：存储访谈总结

### 索引设计

1. **topics集合**：
   - `{ title: 1 }` - 支持按标题搜索
   - `{ createdAt: -1 }` - 支持按创建时间排序

2. **interviews集合**：
   - `{ topicId: 1 }` - 支持按主题查询
   - `{ status: 1, createdAt: -1 }` - 支持按状态和时间查询

3. **summaries集合**：
   - `{ interviewId: 1 }` - 支持按访谈ID查询

## 多模态接口设计（预留）

### 面部表情分析接口

```javascript
// 面部表情分析服务
class FacialAnalysisService {
  async analyze(imageData) {
    // 预留实现
    return {
      emotions: {
        happy: 0.7,
        sad: 0.1,
        angry: 0.05,
        surprised: 0.1,
        neutral: 0.05
      },
      confidence: 0.85
    };
  }
}
```

### 声音分析接口

```javascript
// 声音分析服务
class VoiceAnalysisService {
  async analyze(audioData) {
    // 预留实现
    return {
      tone: {
        confident: 0.6,
        hesitant: 0.2,
        nervous: 0.1,
        calm: 0.1
      },
      pace: 'normal',
      volume: 'medium',
      confidence: 0.8
    };
  }
}
```

## 并发支持设计

1. **水平扩展**：
   - 使用负载均衡器分发请求
   - 多实例部署后端服务

2. **异步处理**：
   - 使用消息队列处理模型推理请求
   - 长时间运行的任务放入后台处理

3. **连接池**：
   - 使用MongoDB连接池
   - 限制并发模型调用数量

4. **缓存策略**：
   - 缓存频繁访问的数据
   - 使用Redis存储会话状态

## 安全设计

1. **认证与授权**：
   - JWT认证
   - 基于角色的访问控制

2. **数据保护**：
   - 敏感数据加密
   - HTTPS传输

3. **输入验证**：
   - 请求数据验证
   - 防SQL注入和XSS攻击

## 部署架构

```
[用户] --> [负载均衡器] --> [前端服务器(Vue)] --> [API网关]
                                                  |
                                                  |--> [后端服务器(Node.js)]
                                                  |        |
                                                  |        v
                                                  |    [MongoDB]
                                                  |
                                                  |--> [模型服务(vLLM)]
                                                  |
                                                  |--> [多模态分析服务(预留)]
```

## 技术栈选择

1. **前端**：
   - Vue.js 3
   - Vuex 4
   - Vue Router 4
   - Axios
   - Element Plus

2. **后端**：
   - Node.js
   - Express.js
   - Mongoose

3. **数据库**：
   - MongoDB

4. **模型服务**：
   - Node.js
   - vLLM
   - WebSocket (用于实时通信)

5. **开发工具**：
   - ESLint
   - Prettier
   - Jest (测试)
   - Docker (容器化)
