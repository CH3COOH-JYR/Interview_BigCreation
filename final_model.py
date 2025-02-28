import re
import json
import requests
class CompletionOutput:
    def __init__(self, text):
        self.text = text

class CompletionResult:
    def __init__(self, outputs):
        self.outputs = outputs  # outputs应该是CompletionOutput实例的列表
###########################
# API调用适配层（核心修改）
###########################
API_URL = "http://10.77.110.129:8000/v1/chat/completions"
HEADERS = {"Content-Type": "application/json"}
MODEL_NAME = "/home/zhangyuheng/.cache/modelscope/hub/Qwen/Qwen2.5-7B-Instruct"

class APIAdapter:
    @staticmethod
    def generate(text_list, sampling_params):
        """替换原有的vLLM generate方法"""
        responses = []
        for text in text_list:
            # 解析原apply_chat_template生成的文本格式
            # 示例：假设原格式为"[INST] {system} [/INST] {user} [/INST]"
            # 这里需要根据实际模板格式解析出messages
            parsed_messages = APIAdapter._parse_template_text(text)
            
            data = {
                "model": MODEL_NAME,
                "messages": parsed_messages,
                "temperature": sampling_params.temperature,
                "top_p": sampling_params.top_p,
                "repetition_penalty": sampling_params.repetition_penalty,
                "max_tokens": sampling_params.max_tokens
            }
            
            try:
                response = requests.post(API_URL, headers=HEADERS, json=data, timeout=30)
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    # 关键修改：将输出包装为列表
                    responses.append([CompletionOutput(content)])  # <- 注意这里变成二维列表
                else:
                    responses.append([CompletionOutput(f"API Error: {response.status_code}")])
            except Exception as e:
                responses.append([CompletionOutput(f"Connection Error: {str(e)}")])
        
        # 结构调整：每个返回项对应一个CompletionResult
        return [CompletionResult(outputs) for outputs in responses]

    @staticmethod
    def _parse_template_text(text):
        """逆向解析apply_chat_template生成的文本（关键修改点）"""
        # 这里需要根据原tokenizer实际生成的模板格式进行解析
        # 示例解析逻辑（需根据实际情况调整）：
        messages = []
        
        # 匹配系统消息
        system_match = re.search(r'<\|system\|>(.*?)<\|end\|>', text, re.DOTALL)
        if system_match:
            messages.append({
                "role": "system",
                "content": system_match.group(1).strip()
            })
        
        # 匹配用户消息
        user_match = re.search(r'<\|user\|>(.*?)<\|end\|>', text, re.DOTALL)
        if user_match:
            messages.append({
                "role": "user",
                "content": user_match.group(1).strip()
            })
        
        # 匹配assistant消息（如果有）
        assistant_match = re.search(r'<\|assistant\|>(.*?)<\|end\|>', text, re.DOTALL)
        if assistant_match:
            messages.append({
                "role": "assistant",
                "content": assistant_match.group(1).strip()
            })
        
        return messages
class DummyTokenizer:
    @staticmethod
    def apply_chat_template(messages, tokenize=False, add_generation_prompt=True):
        """模拟原tokenizer的模板生成逻辑"""
        # 这里需要与原模型模板格式保持一致
        template = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            template += f"<|{role}|>{content}<|end|>\n"
        if add_generation_prompt:
            template += "<|assistant|>"
        return template

tokenizer = DummyTokenizer()  # 替换原有tokenizer初始化

# 保持原有SamplingParams和LLM初始化（原代码14-18行）
class SamplingParams:
    def __init__(self, 
                 temperature=0.6,
                 top_p=0.9,
                 repetition_penalty=1.02,
                 max_tokens=512):
        self.temperature = temperature
        self.top_p = top_p
        self.repetition_penalty = repetition_penalty
        self.max_tokens = max_tokens

sampling_params = SamplingParams()
llm = APIAdapter()

###########################
# ---- 工具函数（访谈逻辑）----
###########################

def check_unanswerable(current_question, user_response):
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert in analyzing user responses. The user might be reluctant or uncomfortable answering. "
                "We want a YES/NO decision: \n"
                " - YES: The user is unwilling, reluctant, or implicitly refusing to answer. \n"
                " - NO: Otherwise.\n"
                "Only output 'YES' or 'NO'."
            )
        },
        {
            "role": "user",
            "content": (
                f"当前问题: {current_question}\n"
                f"用户回答: {user_response}\n\n"
                "请判断：该用户是否不愿回答当前问题？"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    decision = outputs[0].outputs[0].text.strip().upper()

    return "YES" if "YES" in decision else "NO"


def generate_overall_background_question(interview_outline):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a skilled interviewer. Generate a short introductory question to learn about "
                "the interviewee's overall background or personal connection with the interview theme."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                "请生成一个简短的问题，引导受访者谈谈与这个大纲相关的个人背景、经历或看法。"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    background_question = outputs[0].outputs[0].text.strip()
    background_question = re.sub(r'[^\w\s]', '', background_question)
    return background_question


def generate_transition(previous_question, next_question=None):
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
    messages = [
        {
            "role": "system",
            "content": "You are a skilled interviewer. Generate smooth, natural, and engaging transition statements."
        },
        {
            "role": "user",
            "content": user_content
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    transition_sentence = outputs[0].outputs[0].text.strip()
    transition_sentence = re.sub(r'[^\w\s]', '', transition_sentence)
    return transition_sentence


def evaluate_response(current_question, user_response):
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert in qualitative interviews. "
                "Your task is to analyze the depth of the interviewee's response "
                "based on four key criteria:\n"
                "1. Multiple Perspectives\n"
                "2. Personal Relevance\n"
                "3. Impact or Future Outlook\n"
                "4. Logical & Organized\n\n"
                "Return 'SURFACE' if the response is lacking in detail.\n"
                "Return 'DEEPER' if it is somewhat detailed but can be further explored.\n"
                "Return 'ENOUGH' if it meets at least 3 out of 4 criteria above."
            )
        },
        {
            "role": "user",
            "content": (
                f"当前问题: {current_question}\n"
                f"受访者的回答: {user_response}\n"
                "请基于上述标准给出判断：'SURFACE'，'DEEPER' 或 'ENOUGH'。"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    decision = outputs[0].outputs[0].text.strip().upper()
    return decision


def generate_deeper_question(current_question, user_response):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a skilled qualitative researcher. Generate one open-ended question "
                "to explore deeper. Ask about motivations, emotions, long-term impact, or alternative perspectives. "
                "Do NOT generate yes/no questions."
            )
        },
        {
            "role": "user",
            "content": (
                f"当前问题: {current_question}\n"
                f"受访者的回答: {user_response}\n"
                "请生成一个更深入的问题，引导受访者适度反思和阐述。"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    deeper_question = outputs[0].outputs[0].text.strip()
    deeper_question = re.sub(r'[^\w\s]', '', deeper_question)
    return deeper_question


def handle_unanswerable_response(current_question):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional interviewer. "
                "The interviewee is unable or unwilling to answer the current question. "
                "Generate a new, related question that explores the same topic from a different angle."
            )
        },
        {
            "role": "user",
            "content": (
                f"当前问题: {current_question}\n"
                "受访者无法回答，请生成一个不同但仍然相关且可能更容易回答的问题。"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    new_question = outputs[0].outputs[0].text.strip()
    new_question = re.sub(r'[^\w\s]', '', new_question)
    return new_question


###########################
# ---- 分析阶段（多步）----
###########################
def analyze_interview_outline(interview_outline, key_questions):
    """
    如果你想让模型对大纲进行多步分析，可以扩展此函数：
      Step 1) 理解每一个关键主题
      Step 2) 预测访谈走向
      Step 3) 提出问题框架
      Step 4) 提出评分指标
    
    - 分析的结果不需要输出（不打印），只在内存中留存
    - 返回“评分指标”供后续总结阶段使用
    """
    # 在此使用一个字典来存储可能的分析结果
    analysis_data = {
        "topics_interpretation": None,
        "possible_directions": None,
        "question_framework": None,
        "rating_metrics": None
    }

    # --- Step 1: 理解每一个关键主题 ---
    messages_step1 = [
        {
            "role": "system",
            "content": (
                "You are in the 'analysis state' (step 1). "
                "Please interpret each key topic from the interview outline in detail. "
                "Do NOT produce final output for the user; only analyze."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                f"关键问题: {key_questions}\n"
                "请对以上主题进行理解和解读，谈谈它们代表的含义。"
            )
        }
    ]
    text_step1 = tokenizer.apply_chat_template(messages_step1, tokenize=False, add_generation_prompt=True)
    outputs_step1 = llm.generate([text_step1], sampling_params)
    step1_result = outputs_step1[0].outputs[0].text.strip()

    # 存到 analysis_data 但不打印
    analysis_data["topics_interpretation"] = step1_result

    # --- Step 2: 预测访谈走向 ---
    messages_step2 = [
        {
            "role": "system",
            "content": (
                "You are in the 'analysis state' (step 2). "
                "Predict the possible directions or scenarios that may emerge during the interview. "
                "Focus on potential follow-up angles or sensitive points."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                f"关键问题: {key_questions}\n"
                "请预测该访谈可能的走向与潜在话题分支。"
            )
        }
    ]
    text_step2 = tokenizer.apply_chat_template(messages_step2, tokenize=False, add_generation_prompt=True)
    outputs_step2 = llm.generate([text_step2], sampling_params)
    step2_result = outputs_step2[0].outputs[0].text.strip()
    analysis_data["possible_directions"] = step2_result

    # --- Step 3: 提出问题框架 ---
    messages_step3 = [
        {
            "role": "system",
            "content": (
                "You are in the 'analysis state' (step 3). "
                "Propose a question framework or structure for the interview. "
                "Be specific, but do not reveal it to the user directly, we only need it for internal reference."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                f"关键问题: {key_questions}\n"
                "请提出一个可行的提问框架，仅供内部参考。"
            )
        }
    ]
    text_step3 = tokenizer.apply_chat_template(messages_step3, tokenize=False, add_generation_prompt=True)
    outputs_step3 = llm.generate([text_step3], sampling_params)
    step3_result = outputs_step3[0].outputs[0].text.strip()
    analysis_data["question_framework"] = step3_result

    # --- Step 4: 提出评分指标（重点）---
    messages_step4 = [
        {
            "role": "system",
            "content": (
                "You are in the 'analysis state' (step 4). "
                "Based on the interview outline, propose a list of rating metrics. "
                "These metrics will be used later to evaluate how well the interviewee meets certain criteria. "
                "Only output them in plain text, one metric per line or a simple list."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                f"关键问题: {key_questions}\n"
                "请提出与访谈主题相关的评分指标（数量与主题相近，或稍多）。"
            )
        }
    ]
    text_step4 = tokenizer.apply_chat_template(messages_step4, tokenize=False, add_generation_prompt=True)
    outputs_step4 = llm.generate([text_step4], sampling_params)
    step4_result = outputs_step4[0].outputs[0].text.strip()
    analysis_data["rating_metrics"] = step4_result

    # 注意：step4_result 可能是文字段落，需要我们做简单的分行或解析：
    # 比如如果模型输出:
    # "1. 对主题A的理解\n2. 对主题B的经验\n3. 态度..."
    # 可以把它拆分成列表
    rating_metrics_list = []
    for line in step4_result.splitlines():
        line = line.strip()
        # 简单判断一下是否是空行或编号
        if line and not line.lower().startswith("step") and not line.startswith("---"):
            rating_metrics_list.append(line)

    # 返回 rating_metrics_list 即可
    return rating_metrics_list


###########################
# ---- 最终总结阶段 ----
###########################
def generate_final_summary(dialog_history, interview_outline, rating_metrics):
    """
    让模型基于访谈完整对话 & 评分指标，生成最终的 JSON 总结：
      "takeaways": 访谈主要结论或洞察
      "points":    列表（与 rating_metrics 顺序对应的分值）
      "explanations": 对每个分值的解释
    """
    # 将对话转成文本
    conversation_text = ""
    for turn in dialog_history:
        role = turn["role"]
        content = turn["content"]
        conversation_text += f"{role}: {content}\n"

    # 将评分指标也传给大模型
    rating_metrics_str = "\n".join(f"- {m}" for m in rating_metrics)

    messages = [
        {
            "role": "system",
            "content": (
                "You are now in the '总结状态'. You have the entire interview transcript. "
                "You also have a set of rating metrics. "
                "You will produce a final summary in JSON format with the structure:\n\n"
                "{\n"
                "  \"takeaways\": \"...\",      // main conclusions\n"
                "  \"points\": [...],           // numeric scores for each metric\n"
                "  \"explanations\": [...]      // explanation for each score\n"
                "}\n\n"
                "Only output valid JSON with these three keys."
            )
        },
        {
            "role": "user",
            "content": (
                f"访谈大纲: {interview_outline}\n"
                f"访谈完整记录:\n{conversation_text}\n\n"
                f"评分指标列表:\n{rating_metrics_str}\n\n"
                "请根据以上信息，对受访者进行打分。"
                "将上述总结转换为json字典，第一个键是takeaways，"
                "值是一个字符串，包含你从访谈中得到的结论；"
                "第二个键是points，值是一个列表，每个元素是对应的评分指标的分值；"
                "第三个键是explanations，值是一个列表，对应每个评分指标的解释。"
                "以文本形式输出这个json字典即可。"
            )
        }
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    outputs = llm.generate([text], sampling_params)
    final_summary_json = outputs[0].outputs[0].text.strip()

    return final_summary_json


###########################
# ---- 初始化与主逻辑 ----
###########################
def initialize_interview():
    # 读取 interview_outline.json 文件
    with open("interview_outline.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # 从文件中获取访谈大纲和关键问题
    interview_outline = data["interview_outline"]
    key_questions = data["key_questions"]

    return interview_outline, key_questions


def conduct_interview():
    # 1) 初始化 & 多步分析
    interview_outline, key_questions = initialize_interview()

    # 在分析阶段获取评分指标，但不输出给用户
    rating_metrics = analyze_interview_outline(interview_outline, key_questions)

    # 2) 进入提问状态
    print(f"\n受访者您好，今天我们访谈的主题是：{interview_outline}")

    dialog_history = []

    # 整体背景了解
    overall_bg_question = generate_overall_background_question(interview_outline)
    print(f"\n访谈员: {overall_bg_question}")
    dialog_history.append({"role": "interviewer", "content": overall_bg_question})

    overall_bg_answer = input("受访者: ")
    dialog_history.append({"role": "interviewee", "content": overall_bg_answer})

    # 背景追问
    MAX_BG_QUESTIONS = 3
    bg_count = 1
    depth = evaluate_response(overall_bg_question, overall_bg_answer)

    while depth != "ENOUGH" and bg_count < MAX_BG_QUESTIONS:
        bg_count += 1
        deeper_q = generate_deeper_question(overall_bg_question, overall_bg_answer)
        print(f"\n访谈员: {deeper_q}")
        dialog_history.append({"role": "interviewer", "content": deeper_q})

        overall_bg_answer = input("受访者: ")
        dialog_history.append({"role": "interviewee", "content": overall_bg_answer})

        depth = evaluate_response(deeper_q, overall_bg_answer)

    # 过渡
    if key_questions:
        first_topic = key_questions[0]
        transition = generate_transition(overall_bg_question, first_topic)
    else:
        transition = generate_transition(overall_bg_question, None)

    print(f"\n访谈员（过渡）：{transition}")
    dialog_history.append({"role": "interviewer", "content": transition})

    # 3) 正式访谈
    current_question_idx = 0
    MAX_QUESTIONS_PER_TOPIC = 8

    while current_question_idx < len(key_questions):
        current_question = key_questions[current_question_idx]
        subquestion_count = 1

        print(f"\n访谈员: {current_question}")
        dialog_history.append({"role": "interviewer", "content": current_question})

        user_response = input("受访者: ")
        dialog_history.append({"role": "interviewee", "content": user_response})

        if user_response.lower() in ["exit", "quit", "结束"]:
            print("\n访谈结束，谢谢参与！")
            break

        while True:
            # 不愿回答
            if check_unanswerable(current_question, user_response) == "YES":
                subquestion_count += 1
                if subquestion_count > MAX_QUESTIONS_PER_TOPIC:
                    if current_question_idx + 1 < len(key_questions):
                        next_q = key_questions[current_question_idx + 1]
                        transition_sentence = generate_transition(current_question, next_q)
                    else:
                        transition_sentence = generate_transition(current_question, None)

                    print(f"\n访谈员（过渡）：{transition_sentence}")
                    dialog_history.append({"role": "interviewer", "content": transition_sentence})

                    current_question_idx += 1
                    break

                new_question = handle_unanswerable_response(current_question)
                print(f"\n访谈员: {new_question}")
                dialog_history.append({"role": "interviewer", "content": new_question})

                user_response = input("受访者: ")
                dialog_history.append({"role": "interviewee", "content": user_response})

                if user_response.lower() in ["exit", "quit", "结束"]:
                    print("\n访谈结束，谢谢参与！")
                    return
                continue

            # 评估回答深度
            response_depth = evaluate_response(current_question, user_response)

            if response_depth == "ENOUGH" or user_response.lower() == "继续":
                if current_question_idx + 1 < len(key_questions):
                    next_q = key_questions[current_question_idx + 1]
                    transition_sentence = generate_transition(current_question, next_q)
                else:
                    transition_sentence = generate_transition(current_question, None)

                print(f"\n访谈员（过渡）：{transition_sentence}")
                dialog_history.append({"role": "interviewer", "content": transition_sentence})

                current_question_idx += 1
                break
            else:
                subquestion_count += 1
                if subquestion_count > MAX_QUESTIONS_PER_TOPIC:
                    if current_question_idx + 1 < len(key_questions):
                        next_q = key_questions[current_question_idx + 1]
                        transition_sentence = generate_transition(current_question, next_q)
                    else:
                        transition_sentence = generate_transition(current_question, None)
                    print(f"\n访谈员（过渡）：{transition_sentence}")
                    dialog_history.append({"role": "interviewer", "content": transition_sentence})

                    current_question_idx += 1
                    break

                deeper_question = generate_deeper_question(current_question, user_response)
                print(f"\n访谈员: {deeper_question}")
                dialog_history.append({"role": "interviewer", "content": deeper_question})

                user_response = input("受访者: ")
                dialog_history.append({"role": "interviewee", "content": user_response})

                if user_response.lower() in ["exit", "quit", "结束"]:
                    print("\n访谈结束，谢谢参与！")
                    return

    # 4) 结束 & 总结
    print("\n访谈结束，谢谢参与！\n")
    final_summary_json = generate_final_summary(dialog_history, interview_outline, rating_metrics)

    # 写入文件
    output_filename = "interview_summary.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(final_summary_json)

    print(f"已生成总结并保存到文件: {output_filename}\n")
    print("以下为模型输出的 JSON 总结:\n")
    print(final_summary_json)


# 启动访谈
if __name__ == "__main__":
    conduct_interview()