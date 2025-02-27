import streamlit as st
import json
from interview_logic import *
from utils import *

def initialize_session_state():
    # 确保 st.session_state 的相关属性已初始化
    if "dialog_history" not in st.session_state:
        st.session_state.dialog_history = []  # 用于存储历史记录
        # 初始化时添加一些不影响访谈的问候语或开场白
        st.session_state.dialog_history.append({"role": "interviewer", "content": "很高兴见到你！欢迎参加这次访谈。"})
    if "current_question_idx" not in st.session_state:
        st.session_state.current_question_idx = 0  # 当前问题的索引
    if "current_subquestion_count" not in st.session_state:
        st.session_state.current_subquestion_count = 1  # 当前子问题的计数
    if "waiting_for_input" not in st.session_state:
        st.session_state.waiting_for_input = False  # 是否在等待用户输入
    if "first_question" not in st.session_state:
        st.session_state.first_question = ""  # 用于存储用户第一次回答的内容

def start_interview():
    # 初始化访谈状态
    initialize_session_state()

    # 1. 初始化访谈大纲和关键问题
    interview_outline, key_questions = initialize_interview()
    rating_metrics = analyze_interview_outline(interview_outline, key_questions)

    # 2. 显示访谈主题
    st.markdown(f"### <span style='color:#4CAF50;'>访谈主题：</span><span style='font-size: 20px;'>{interview_outline}</span>", unsafe_allow_html=True)
    
    # 3. 生成并显示背景问题
    overall_bg_question = generate_overall_background_question(interview_outline)
    st.session_state.dialog_history.append({"role": "interviewer", "content": overall_bg_question})
    st.write(f"访谈员: {overall_bg_question}")

    # 4. 用户输入背景问题的答案
    user_response = st.text_area("受访者: ", key="first_question", height=100, on_change=handle_input, help="按Enter键换行，点击发送按钮提交")
    
    # 用户点击发送按钮时提交
    if st.button("发送"):
        st.session_state.first_question = user_response
        st.session_state.dialog_history.append({"role": "interviewee", "content": user_response})
        handle_next_question()

def handle_input():
    if st.session_state.waiting_for_input:
        user_response = st.session_state.first_question
        st.session_state.dialog_history.append({"role": "interviewee", "content": user_response})
        handle_next_question()

def handle_next_question():
    # 当前的访谈状态和回答
    dialog_history = st.session_state.dialog_history
    current_question_idx = st.session_state.current_question_idx
    key_questions = initialize_interview()[1]  # 获取访谈大纲的关键问题

    # 生成问题后，设置为等待输入
    st.session_state.waiting_for_input = True

    if current_question_idx < len(key_questions):
        current_question = key_questions[current_question_idx]

        # 显示加载标识
        with st.spinner("模型生成中……"):
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

    else:
        # 没有问题了，结束访谈
        st.write("访谈结束，谢谢参与！")

def jump_to_next_question():
    # 直接跳到下一个问题
    st.session_state.current_question_idx += 1
    handle_next_question()

def end_interview():
    # 结束访谈并生成总结
    final_summary_json = generate_final_summary(st.session_state.dialog_history, initialize_interview()[0], analyze_interview_outline(initialize_interview()[0], initialize_interview()[1]))
    st.write("访谈结束，谢谢参与！")
    st.json(final_summary_json)

def initialize_interview():
    with open("interview_outline.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    interview_outline = data["interview_outline"]
    key_questions = data["key_questions"]
    return interview_outline, key_questions

def main():
    # 引入外部 CSS
    st.markdown(
        """
        <link rel="stylesheet" href="assets/style.css">
        """, unsafe_allow_html=True
    )

    st.title('自动访谈机器人')
    st.sidebar.title('访谈操作')

    if st.sidebar.button('开始新访谈'):
        start_interview()

    # 添加两个按钮：下一个问题和结束访谈
    st.sidebar.button('下一个问题', on_click=jump_to_next_question)
    st.sidebar.button('结束访谈', on_click=end_interview)

    # 历史记录折叠面板
    with st.expander("点击展开查看访谈历史记录"):
        if st.session_state.dialog_history:
            for entry in st.session_state.dialog_history:
                if entry["role"] == "interviewer":
                    st.write(f"**访谈员:** {entry['content']}")
                else:
                    st.write(f"**受访者:** {entry['content']}")

if __name__ == "__main__":
    initialize_session_state()
    main()
    