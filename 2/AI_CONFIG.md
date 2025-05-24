# AI 模型配置说明

## 当前配置

项目已配置使用第三方AI服务：
- **API地址**: https://api2.aigcbest.top/v1/chat/completions
- **模型**: deepseek-ai/DeepSeek-R1  
- **API Key**: 2222222222222222222222222222222222222222222222 (测试用)

## 环境变量配置

在 `2/backend/` 目录下创建 `.env` 文件来覆盖默认配置：

```env
# AI 功能开关
ENABLE_AI=true  # 设为 true 启用AI功能，false 使用降级模式

# 第三方API服务配置 (当前使用)
AI_API_URL=https://api2.aigcbest.top/v1/chat/completions
AI_MODEL_NAME=deepseek-ai/DeepSeek-R1
AI_API_KEY=你的真实API密钥

# 或者使用原版OpenAI API
# AI_API_URL=https://api.openai.com/v1/chat/completions
# AI_MODEL_NAME=gpt-3.5-turbo
# AI_API_KEY=your_openai_api_key
```

## 降级模式

当AI功能不可用时（API Key无效或网络问题），系统会自动进入降级模式：

- 背景问题：使用预设的通用问题
- 回答评估：基于文本长度的简单算法
- 深入问题：从预设模板中随机选择
- 过渡语句：使用固定的过渡短语
- 评分指标：使用通用的评估标准

## 使用说明

### 当前状态
项目现在使用测试API Key调用DeepSeek-R1模型。如果API调用失败，系统会自动降级到预设模式。

### 获取正式API Key
1. 访问 https://api2.aigcbest.top
2. 注册账号并充值
3. 在后台生成API令牌
4. 将真实API Key替换到配置中

### 启用AI功能
项目默认已启用AI功能。如需要：
1. 确保网络可以访问 https://api2.aigcbest.top
2. 如有问题，检查后端日志查看具体错误
3. 可以随时设置 `ENABLE_AI=false` 切换到降级模式 