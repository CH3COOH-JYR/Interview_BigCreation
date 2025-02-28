import re
import json
import requests

###########################
# API 配置
###########################
API_URL = "http://10.77.110.129:8000/v1/chat/completions"
HEADERS = {"Content-Type": "application/json"}
MODEL_NAME = "/home/zhangyuheng/.cache/modelscope/hub/Qwen/Qwen2.5-7B-Instruct"

# 全局采样参数
DEFAULT_PARAMS = {
    "temperature": 0.6,
    "top_p": 0.9,
    "repetition_penalty": 1.02,
    "max_tokens": 512
}

###########################
# 工具函数
###########################
def query_api(messages, params=None):
    """调用部署好的API"""
    if params is None:
        params = DEFAULT_PARAMS
    
    data = {
        "model": MODEL_NAME,
        "messages": messages,
        **params
    }
    
    try:
        response = requests.post(API_URL, headers=HEADERS, json=data, timeout=30)
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        return f"Error: API request failed with status {response.status_code}"
    except Exception as e:
        return f"Error: {str(e)}"

def build_messages(system_prompt, user_content):
    """构建标准消息结构"""
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]

###########################
# 重构后的核心功能函数
###########################
def check_unanswerable(current_question, user_response):
    system_prompt = (
        "You are an expert in analyzing user responses. The user might be reluctant or uncomfortable answering. "
        "We want a YES/NO decision: \n"
        " - YES: The user is unwilling, reluctant, or implicitly refusing to answer. \n"
        " - NO: Otherwise.\n"
        "Only output 'YES' or 'NO'."
    )
    user_content = (
        f"当前问题: {current_question}\n"
        f"用户回答: {user_response}\n\n"
        "请判断：该用户是否不愿回答当前问题？"
    )
    messages = build_messages(system_prompt, user_content)
    decision = query_api(messages).strip().upper()
    return "YES" if "YES" in decision else "NO"

def generate_overall_background_question(interview_outline):
    system_prompt = (
        "You are a skilled interviewer. Generate a short introductory question to learn about "
        "the interviewee's overall background or personal connection with the interview theme."
    )
    user_content = (
        f"访谈大纲: {interview_outline}\n"
        "请生成一个简短的问题，引导受访者谈谈与这个大纲相关的个人背景、经历或看法。"
    )
    messages = build_messages(system_prompt, user_content)
    background_question = query_api(messages)
    return re.sub(r'[^\w\s]', '', background_question)

def generate_transition(previous_question, next_question=None):
    system_prompt = "You are a skilled interviewer. Generate smooth, natural, and engaging transition statements."
    
    if next_question:
        user_content = (
            f"上一话题: {previous_question}\n"
            f"下一话题: {next_question}\n"
            "请生成一个自然的过渡语句，使访谈流畅，不要显得死板或机械。"
        )
    else:
        user_content = (
            f"上一话题: {previous_question}\n"
            "下一话题: （无）\n"
            "请生成一个自然的结束语或过渡语，使访谈流畅。"
        )
    
    messages = build_messages(system_prompt, user_content)
    transition_sentence = query_api(messages)
    return re.sub(r'[^\w\s]', '', transition_sentence)

def evaluate_response(current_question, user_response):
    system_prompt = (
        "You are an expert in qualitative interviews. Your task is to analyze the depth of the interviewee's response "
        "based on four key criteria:\n"
        "1. Multiple Perspectives\n"
        "2. Personal Relevance\n"
        "3. Impact or Future Outlook\n"
        "4. Logical & Organized\n\n"
        "Return 'SURFACE' if the response is lacking in detail.\n"
        "Return 'DEEPER' if it is somewhat detailed but can be further explored.\n"
        "Return 'ENOUGH' if it meets at least 3 out of 4 criteria above."
    )
    user_content = (
        f"当前问题: {current_question}\n"
        f"受访者的回答: {user_response}\n"
        "请基于上述标准给出判断：'SURFACE'，'DEEPER' 或 'ENOUGH'。"
    )
    messages = build_messages(system_prompt, user_content)
    return query_api(messages).strip().upper()

def generate_deeper_question(current_question, user_response):
    system_prompt = (
        "You are a skilled qualitative researcher. Generate one open-ended question "
        "to explore deeper. Ask about motivations, emotions, long-term impact, or alternative perspectives. "
        "Do NOT generate yes/no questions."
    )
    user_content = (
        f"当前问题: {current_question}\n"
        f"受访者的回答: {user_response}\n"
        "请生成一个更深入的问题，引导受访者适度反思和阐述。"
    )
    messages = build_messages(system_prompt, user_content)
    deeper_question = query_api(messages)
    return re.sub(r'[^\w\s]', '', deeper_question)

def handle_unanswerable_response(current_question):
    system_prompt = (
        "You are a professional interviewer. The interviewee is unable or unwilling to answer the current question. "
        "Generate a new, related question that explores the same topic from a different angle."
    )
    user_content = (
        f"当前问题: {current_question}\n"
        "受访者无法回答，请生成一个不同但仍然相关且可能更容易回答的问题。"
    )
    messages = build_messages(system_prompt, user_content)
    new_question = query_api(messages)
    return re.sub(r'[^\w\s]', '', new_question)

###########################
# 重构后的分析阶段
###########################
def analyze_interview_outline(interview_outline, key_questions):
    analysis_steps = [
        {
            "name": "topics_interpretation",
            "system": "Interpret each key topic from the interview outline in detail.",
            "user": "请对以上主题进行理解和解读，谈谈它们代表的含义。"
        },
        {
            "name": "possible_directions",
            "system": "Predict possible directions or scenarios that may emerge during the interview.",
            "user": "请预测该访谈可能的走向与潜在话题分支。"
        },
        {
            "name": "question_framework",
            "system": "Propose a question framework or structure for the interview.",
            "user": "请提出一个可行的提问框架，仅供内部参考。"
        },
        {
            "name": "rating_metrics",
            "system": "Propose rating metrics based on the interview outline.",
            "user": "请提出与访谈主题相关的评分指标（数量与主题相近，或稍多）。"
        }
    ]

    analysis_data = {}
    for step in analysis_steps:
        messages = build_messages(
            system_prompt=f"You are in analysis state. {step['system']}",
            user_content=f"访谈大纲: {interview_outline}\n关键问题: {key_questions}\n{step['user']}"
        )
        result = query_api(messages, params={"max_tokens": 1024})
        analysis_data[step["name"]] = result

    # 处理评分指标
    rating_metrics = []
    for line in analysis_data["rating_metrics"].split('\n'):
        if line.strip() and not line.startswith(("---", "Note")):
            rating_metrics.append(line.strip())
    
    return rating_metrics[:len(key_questions)+2]  # 控制指标数量

###########################
# 重构后的总结阶段
###########################
def generate_final_summary(dialog_history, interview_outline, rating_metrics):
    conversation_text = "\n".join([f"{turn['role']}: {turn['content']}" for turn in dialog_history])
    rating_metrics_str = "\n".join(f"- {m}" for m in rating_metrics)

    system_prompt = (
        "Produce a final summary in JSON format with the structure:\n"
        "{\n"
        "  \"takeaways\": \"...\",\n"
        "  \"points\": [...],\n"
        "  \"explanations\": [...]\n"
        "}\n"
        "Only output valid JSON."
    )
    
    user_content = (
        f"访谈大纲: {interview_outline}\n"
        f"访谈记录:\n{conversation_text}\n\n"
        f"评分指标:\n{rating_metrics_str}\n"
        "生成包含结论、分数和解释的JSON总结。"
    )
    
    messages = build_messages(system_prompt, user_content)
    result = query_api(messages, params={"max_tokens": 1024})
    
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"error": "Failed to generate valid JSON summary"}

###########################
# 主流程保持不变（需确保使用新的函数）
###########################
# [保持原有 initialize_interview 和 conduct_interview 函数逻辑不变]
# [注意：需要移除所有本地模型相关代码，改用上述API函数]