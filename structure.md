final_model.py文件实现了url访问已部署模型的同时在命令行中实现访谈(请忽略url_model.py)

class DummyTokenizer是伪tokenizer的实现

总体流程是直接用conduct_interview()函数开始
进入conduct_interview()后再调用initialize_interview()来读取interview_outline中的内容
conduct_interview()中调用的其他函数：
其余函数：
1.analyze_interview_outline() 让大模型生成问题可能的方向以及评分标准
2.generate_overall_background_question() 生成访谈前的背景问题
3.evaluate_response() 评估回答深度是否足够
4.check_unanswerable() 评估受访者是否不愿回答当前提出的问题
5.generate_transition() 生成问题之间的过渡句
6.generate_deeper_question() 追问深度不够，继续生成深层问题
7.generate_final_summary() 生成最终总结

流程图：
┌───────────────────────────────────────────┐
│            conduct_interview()            │
│           （主访谈控制逻辑）                 │
│  1) initialize_interview()                │
│     -等用户输入访谈大纲、关键问题              │
│  2) analyze_interview_outline()           │
│     - Step1~4多步分析，得到评分指标           │
│  3) 访谈流程：                              │
│     ┌─────────┐                           │
│     │3.1 整体背景问答                       │
│     │  - generate_overall_background_     │
│     │    question()                       │
│     │  - evaluate_response()              │
│     │  - generate_deeper_question()       │
│     └─────────┘                           │
│     ┌─────────┐                           │
│     │3.2 针对每个关键问题循环提问             │
│     │  - check_unanswerable()             │
│     │  - handle_unanswerable_response()   │
│     │  - evaluate_response()              │
│     │  - generate_deeper_question()       │
│     │  - generate_transition()            │
│     └─────────┘                           │
│  4) 结束后：                                │
│     - generate_final_summary()            │
│     - 输出JSON到文件interview_summary.json  │
└───────────────────────────────────────────┘
   ↑
   │
   │  其他工具函数（在访谈流程中被调用）
   │  ┌──────────────────────────────────┐
   └─▶│ check_unanswerable()            │
      │ generate_transition()           │
      │ generate_deeper_question()      │
      │ handle_unanswerable_response()  │
      │ evaluate_response()             │
      └──────────────────────────────────┘

┌────────────────────────────────────────────────┐
│         analyze_interview_outline()            │
│  (多步分析：返回 rating_metrics 用于最终评分)      │
│   Step1: 解释访纲主题                            │
│   Step2: 预测访谈可能走向                         │
│   Step3: 构建提问框架                            │
│   Step4: 生成评分指标 (最终返回)                  │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ generate_final_summary()                       │
│   - 整合对话历史(dialog_history)                 │
│   - 应用 rating_metrics                         │
│   - 生成 {                                      │
│       "takeaways": "...",                      │
│       "points": [...],                         │
│       "explanations": [...]                    │
│     } 结构的JSON输出                             │
└────────────────────────────────────────────────┘
