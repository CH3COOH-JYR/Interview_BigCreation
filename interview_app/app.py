import streamlit as st
import json
from interview_logic import *
from utils import *

def start_interview():
    # 1. 初始化访谈大纲和关键问题
    interview_outline, key_questions = initialize_interview()
    rating_metrics = analyze_interview_outline(interview_outline, key_questions)

    # 初始化 session_state 用来跟踪访谈进度
    if "dialog_history" not in st.session_state:
        st.session_state.dialog_history = []
    if "current_question_idx" not in st.session_state:
        st.session_state.current_question_idx = 0
    if "current_subquestion_count" not in st.session_state:
        st.session_state.current_subquestion_count = 1

    # 2. 显示访谈主题
    st.write(f"### 访谈主题：{interview_outline}")
    
    # 3. 生成并显示背景问题
    overall_bg_question = generate_overall_background_question(interview_outline)
    st.session_state.dialog_history.append({"role": "interviewer", "content": overall_bg_question})
    st.write(f"访谈员: {overall_bg_question}")

    # 4. 用户输入背景问题的答案
    user_response = st.text_input("受访者: ", key="first_question", on_change=handle_input)
    if user_response:
        st.session_state.dialog_history.append({"role": "interviewee", "content": user_response})

        # 根据用户的回答生成下一个问题或过渡句
        handle_next_question()

def handle_input():
    # 用户输入后，处理输入并更新页面
    user_response = st.session_state.first_question
    st.session_state.dialog_history.append({"role": "interviewee", "content": user_response})
    handle_next_question()

def handle_next_question():
    # 当前的访谈状态和回答
    dialog_history = st.session_state.dialog_history
    current_question_idx = st.session_state.current_question_idx
    current_subquestion_count = st.session_state.current_subquestion_count
    key_questions = initialize_interview()[1]  # 获取访谈大纲的关键问题

    if current_question_idx < len(key_questions):
        current_question = key_questions[current_question_idx]

        # 评估回答深度
        response_depth = evaluate_response(current_question, dialog_history[-1]["content"])

        if response_depth == "ENOUGH" or st.session_state.first_question.lower() == "继续":
            # 问题回答足够深入，生成过渡
            if current_question_idx + 1 < len(key_questions):
                next_q = key_questions[current_question_idx + 1]
                transition_sentence = generate_transition(current_question, next_q)
                st.session_state.dialog_history.append({"role": "interviewer", "content": transition_sentence})
                st.write(f"访谈员（过渡）：{transition_sentence}")
                st.session_state.current_question_idx += 1
                st.session_state.current_subquestion_count = 1
            else:
                # 结束访谈
                final_summary_json = generate_final_summary(dialog_history, initialize_interview()[0], analyze_interview_outline(initialize_interview()[0], key_questions))
                st.write("访谈结束，谢谢参与！")
                st.json(final_summary_json)
                return
        else:
            # 问题不够深入，生成更深入的问题
            deeper_question = generate_deeper_question(current_question, dialog_history[-1]["content"])
            st.session_state.dialog_history.append({"role": "interviewer", "content": deeper_question})
            st.write(f"访谈员: {deeper_question}")
            st.session_state.current_subquestion_count += 1
            st.session_state.first_question = ""  # 清空输入框
            st.text_input("受访者: ", key="first_question", on_change=handle_input)

    else:
        # 没有问题了，结束访谈
        st.write("访谈结束，谢谢参与！")

def initialize_interview():
    with open("interview_outline.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    interview_outline = data["interview_outline"]
    key_questions = data["key_questions"]
    return interview_outline, key_questions

def main():
    st.title('自动访谈机器人')
    st.sidebar.title('访谈操作')

    if st.sidebar.button('开始新访谈'):
        start_interview()

if __name__ == "__main__":
    main()