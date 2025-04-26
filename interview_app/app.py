import streamlit as st
import json
import re
from interview_logic import *
from utils import *
import time
import uuid  # 添加uuid库用于生成唯一key

# 添加缓存装饰器
@st.cache_resource
def get_model():
    """缓存模型资源，只加载一次"""
    # 这里不做实际操作，只是作为一个标记表示模型已加载
    return True

def load_css():
    # Ensure the path is correct relative to the location of app.py
    css_path = "assets/styles.css"
    try:
        with open(css_path) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.error(f"CSS file not found at {css_path}. Please check the file path.")

# 清理JSON字符串，移除Markdown标记和其他非法字符
def clean_json_string(json_str):
    """清理JSON字符串，移除可能的Markdown标记和其他非法字符"""
    if not isinstance(json_str, str):
        return json_str
        
    # 移除Markdown代码块标记
    pattern = r'```(?:json)?\s*([\s\S]*?)```'
    match = re.search(pattern, json_str)
    if match:
        json_str = match.group(1).strip()
    
    # 尝试修复常见的JSON格式问题
    json_str = json_str.replace('\n', ' ').replace('\r', '')
    json_str = re.sub(r'(?<!\\)"(\w+)":', r'"\1":', json_str)  # 确保键名正确引用
    
    return json_str

def start_interview():
    # 确保模型已加载（只会执行一次）
    get_model()
    
    # 获取当前大纲和问题
    interview_outline, key_questions = initialize_interview()
    
    # 检查大纲是否改变或未分析
    outline_changed = (
        "current_outline" not in st.session_state or 
        st.session_state.current_outline != interview_outline
    )
    
    # 只有当大纲变化或未分析时才重新分析
    if outline_changed:
        with st.spinner("正在分析访谈大纲..."):
            rating_metrics = analyze_interview_outline(interview_outline, key_questions)
            st.session_state.rating_metrics = rating_metrics
            st.session_state.current_outline = interview_outline
    
    # 更新session_state中的数据
    st.session_state.interview_outline = interview_outline
    st.session_state.key_questions = key_questions
    
    # 重置访谈进度
    st.session_state.dialog_history = []
    st.session_state.current_question_idx = 0
    st.session_state.current_subquestion_count = 1
    
    # 清除之前的总结
    if "final_summary" in st.session_state:
        del st.session_state.final_summary
    
    # 设置访谈状态为活跃
    st.session_state.interview_active = True
    
    # 重置输入框状态
    if "input_key" not in st.session_state:
        st.session_state.input_key = str(uuid.uuid4())
    else:
        st.session_state.input_key = str(uuid.uuid4())
    
    # 生成背景问题
    with st.spinner("生成背景问题..."):
        overall_bg_question = generate_overall_background_question(interview_outline)
        st.session_state.overall_bg_question = overall_bg_question
        st.session_state.dialog_history = [{"role": "interviewer", "content": overall_bg_question}]

def display_interview_ui():
    # 只有当访谈活跃时才显示访谈界面
    if "interview_active" not in st.session_state or not st.session_state.interview_active:
        if "final_summary" not in st.session_state:
            st.info("请点击侧边栏的「开始访谈」按钮开始")
        return
    
    if "interview_outline" not in st.session_state:
        st.info("请点击侧边栏的「开始访谈」按钮开始")
        return
    
    # 显示访谈主题
    st.write(f"### 访谈主题：{st.session_state.interview_outline}")
    
    # 显示对话历史
    for entry in st.session_state.dialog_history:
        role = "访谈员" if entry["role"] == "interviewer" else "受访者"
        content = entry["content"]
        if role == "访谈员":
            st.markdown(f"<div class='interviewer'><b>{role}:</b> {content}</div>", unsafe_allow_html=True)
        else:
            st.markdown(f"<div class='interviewee'><b>{role}:</b> {content}</div>", unsafe_allow_html=True)
    
    # 如果最后一条消息是访谈员的，显示输入框
    if not st.session_state.dialog_history or st.session_state.dialog_history[-1]["role"] == "interviewer":
        # 确保有唯一的input_key
        if "input_key" not in st.session_state:
            st.session_state.input_key = str(uuid.uuid4())
        
        # 使用带有唯一key的表单
        with st.form(key=f"user_input_form_{st.session_state.input_key}", clear_on_submit=True):
            user_response = st.text_area("输入您的回答:", key=f"user_input_{st.session_state.input_key}", height=100)
            submit_button = st.form_submit_button("发送")
            
            if submit_button and user_response:
                st.session_state.dialog_history.append({"role": "interviewee", "content": user_response})
                # 生成新的input_key确保下次表单是全新的
                st.session_state.input_key = str(uuid.uuid4())
                # 处理用户回答
                handle_next_question()
                # 重新加载UI以显示新消息
                st.experimental_rerun()

def handle_next_question():
    # 如果对话历史为空，不处理
    if not st.session_state.dialog_history:
        return
    
    # 当前的访谈状态和回答
    dialog_history = st.session_state.dialog_history
    current_question_idx = st.session_state.current_question_idx
    current_subquestion_count = st.session_state.current_subquestion_count
    key_questions = st.session_state.key_questions
    
    # 如果最后一条消息不是用户的，直接返回
    if dialog_history[-1]["role"] != "interviewee":
        return
    
    user_response = dialog_history[-1]["content"]
    
    # 如果没有更多问题，生成总结
    if current_question_idx >= len(key_questions):
        with st.spinner("生成总结中..."):
            final_summary_json = generate_final_summary(
                dialog_history, 
                st.session_state.interview_outline, 
                st.session_state.rating_metrics
            )
            # 清理JSON字符串
            final_summary_json = clean_json_string(final_summary_json)
            st.session_state.final_summary = final_summary_json
        return
    
    # 当前问题
    current_question = key_questions[current_question_idx]
    
    # 评估回答深度
    with st.spinner("分析回答中..."):
        response_depth = evaluate_response(current_question, user_response)
    
    # 根据深度决定下一步
    if response_depth == "ENOUGH" or user_response.lower() == "继续":
        # 问题回答足够深入，生成过渡到下一个问题
        if current_question_idx + 1 < len(key_questions):
            with st.spinner("生成过渡中..."):
                next_q = key_questions[current_question_idx + 1]
                transition_sentence = generate_transition(current_question, next_q)
                st.session_state.dialog_history.append({"role": "interviewer", "content": transition_sentence})
            st.session_state.current_question_idx += 1
            st.session_state.current_subquestion_count = 1
        else:
            # 所有问题都回答完毕
            with st.spinner("生成总结中..."):
                final_summary_json = generate_final_summary(
                    dialog_history, 
                    st.session_state.interview_outline, 
                    st.session_state.rating_metrics
                )
                # 清理JSON字符串
                final_summary_json = clean_json_string(final_summary_json)
                st.session_state.final_summary = final_summary_json
                st.session_state.dialog_history.append({"role": "interviewer", "content": "访谈结束，感谢您的参与！"})
    else:
        # 问题不够深入，生成更深入的问题
        with st.spinner("生成深入问题..."):
            deeper_question = generate_deeper_question(current_question, user_response)
            st.session_state.dialog_history.append({"role": "interviewer", "content": deeper_question})
        st.session_state.current_subquestion_count += 1

def handle_next_button_click():
    # 如果没有开始访谈，不处理
    if "dialog_history" not in st.session_state or not st.session_state.dialog_history:
        st.warning("请先开始访谈")
        return
    
    # 强制进入下一个问题
    current_question_idx = st.session_state.current_question_idx
    key_questions = st.session_state.key_questions
    
    # 如果没有更多问题，结束访谈
    if current_question_idx >= len(key_questions) - 1:
        with st.spinner("生成总结中..."):
            final_summary_json = generate_final_summary(
                st.session_state.dialog_history, 
                st.session_state.interview_outline, 
                st.session_state.rating_metrics
            )
            # 清理JSON字符串
            final_summary_json = clean_json_string(final_summary_json)
            st.session_state.final_summary = final_summary_json
            st.session_state.dialog_history.append({"role": "interviewer", "content": "访谈结束，感谢您的参与！"})
    else:
        # 显示下一个问题
        with st.spinner("生成下一个问题..."):
            next_q = key_questions[current_question_idx + 1]
            transition_sentence = generate_transition(
                key_questions[current_question_idx] if current_question_idx < len(key_questions) else "上一个话题", 
                next_q
            )
            st.session_state.dialog_history.append({"role": "interviewer", "content": transition_sentence})
        st.session_state.current_question_idx += 1
        st.session_state.current_subquestion_count = 1
    
    # 重新加载UI以显示新消息
    st.experimental_rerun()

def end_interview():
    """结束访谈并显示总结"""
    if "dialog_history" in st.session_state and st.session_state.dialog_history:
        with st.spinner("生成总结中..."):
            final_summary_json = generate_final_summary(
                st.session_state.dialog_history, 
                st.session_state.interview_outline if "interview_outline" in st.session_state else "", 
                st.session_state.rating_metrics if "rating_metrics" in st.session_state else []
            )
            # 清理JSON字符串
            final_summary_json = clean_json_string(final_summary_json)
            st.session_state.final_summary = final_summary_json
            
            # 设置访谈为非活跃，停止显示访谈界面
            st.session_state.interview_active = False
            
        st.experimental_rerun()
    else:
        st.warning("请先开始访谈")

def initialize_interview():
    with open("interview_outline.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    interview_outline = data["interview_outline"]
    key_questions = data["key_questions"]
    return interview_outline, key_questions

def display_final_summary():
    if "final_summary" in st.session_state:
        st.markdown("<h2 class='summary-title'>访谈总结</h2>", unsafe_allow_html=True)
        try:
            # 尝试解析JSON字符串
            if isinstance(st.session_state.final_summary, str):
                # 再次确保处理过Markdown标记
                clean_json = clean_json_string(st.session_state.final_summary)
                
                # 显示调试信息（正式版可以移除）
                # st.write("调试: 准备解析的JSON字符串")
                # st.code(clean_json, language="json")
                
                try:
                    summary_data = json.loads(clean_json)
                except json.JSONDecodeError as e:
                    st.error(f"JSON解析错误: {str(e)}")
                    st.code(clean_json, language="json")
                    return
            else:
                summary_data = st.session_state.final_summary
                
            # 显示结构化的总结
            st.markdown("### 主要结论")
            st.write(summary_data.get("takeaways", "无主要结论"))
            
            st.markdown("### 评分与解释")
            if "points" in summary_data and "explanations" in summary_data:
                points = summary_data["points"]
                explanations = summary_data["explanations"]
                
                # 检查评分指标是否存在
                if "rating_metrics" in st.session_state:
                    metrics = st.session_state.rating_metrics
                    for i, (metric, point, explanation) in enumerate(zip(metrics, points, explanations)):
                        st.markdown(f"**{metric}**: {point}/10")
                        st.write(explanation)
                        if i < len(metrics) - 1:
                            st.markdown("---")
                else:
                    # 仅显示评分和解释
                    for i, (point, explanation) in enumerate(zip(points, explanations)):
                        st.markdown(f"**评分 {i+1}**: {point}/10")
                        st.write(explanation)
                        if i < len(points) - 1:
                            st.markdown("---")
            else:
                # 回退到显示原始JSON
                st.json(summary_data)
        except Exception as e:
            # 如果解析失败，显示错误信息和原始JSON
            st.error(f"处理总结时出错: {str(e)}")
            if isinstance(st.session_state.final_summary, str):
                st.code(st.session_state.final_summary)
            else:
                st.json(st.session_state.final_summary)

def main():
    # 设置页面配置
    st.set_page_config(
        page_title="DeepTalk",
        page_icon="💬",
        layout="wide",
    )
    
    # 加载CSS
    load_css()
    
    # 创建固定在顶部的标题栏
    st.markdown("""
    <div class="title-container">
        <h1 class="title">DeepTalk</h1>
    </div>
    """, unsafe_allow_html=True)
    
    # 创建边栏
    st.sidebar.title('访谈操作')
    
    # 初始化session_state
    if "dialog_history" not in st.session_state:
        st.session_state.dialog_history = []
    
    if "input_key" not in st.session_state:
        st.session_state.input_key = str(uuid.uuid4())
    
    if "interview_active" not in st.session_state:
        st.session_state.interview_active = False
    
    # 边栏按钮
    if st.sidebar.button('开始访谈'):
        start_interview()
        st.experimental_rerun()
    
    if st.sidebar.button('下一个问题'):
        handle_next_button_click()
    
    if st.sidebar.button('结束访谈'):
        end_interview()
    
    # 添加聊天记录展示
    with st.sidebar.expander("查看聊天记录", expanded=False):
        st.write("### 聊天记录")
        for entry in st.session_state.dialog_history:
            role = "访谈员" if entry["role"] == "interviewer" else "受访者"
            st.write(f"{role}: {entry['content']}")
    
    # 主界面
    if "final_summary" in st.session_state and not st.session_state.interview_active:
        # 如果有总结且访谈不活跃，只显示总结
        display_final_summary()
    else:
        col1, col2 = st.columns([3, 1])
        
        with col1:
            # 显示访谈界面
            display_interview_ui()
        
        with col2:
            # 显示总结（如果有）
            display_final_summary()

if __name__ == "__main__":
    main()