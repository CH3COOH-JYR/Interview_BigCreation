import streamlit as st
import json
import os
import pandas as pd
from datetime import datetime

# 获取当前工作目录
current_dir = os.getcwd()
# 获取上一级目录
parent_dir = os.path.dirname(current_dir)

def save_to_json(interview_outline, key_questions):
    """Save the interview data to a JSON file"""
    interview_record = {
        'interview_outline': interview_outline,
        'key_questions': key_questions,
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        # Try to read existing data
        try:
            with open('interview_outline.json', 'r', encoding='utf-8') as file:
                data = json.load(file)
                if not isinstance(data, list):
                    data = [data]
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
        
        # Append new record
        data.append(interview_record)
        
        # Write back to file
        with open('interview_outline.json', 'w', encoding='utf-8') as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
            
    except Exception as e:
        st.error(f"保存数据时出错: {str(e)}")
        return False
    
    return True


#输入主题页面
def page_input():
    st.title("访谈前准备")
    
    # 访谈大纲输入
    interview_outline = st.text_area(
        "访谈大纲：",
        height=150,
        key="interview_outline"
    )
    
    # 初始化 session state 用于存储问题列表
    if 'questions' not in st.session_state:
        st.session_state.questions = [""]  # 初始化一个空问题
    
    # 显示所有问题输入框
    st.subheader("请输入关键问题")
    
    # 更新现有问题
    updated_questions = []
    for i, question in enumerate(st.session_state.questions):
        q = st.text_input(f"问题 {i+1}", value=question, key=f"q_{i}")
        updated_questions.append(q)
    
    # 添加新问题的按钮
    if st.button("添加更多问题"):
        st.session_state.questions.append("")
        st.experimental_rerun()
    
    # 提交按钮
    if st.button("提交"):
        # 验证输入
        if not interview_outline.strip():
            st.error("请输入访谈大纲")
            return
            
        # 过滤掉空的问题
        key_questions = [q for q in updated_questions if q.strip()]
        if not key_questions:
            st.error("请至少输入一个关键问题")
            return
            
        # 保存数据
        if save_to_json(interview_outline, key_questions):
            st.success("感谢您的提交！访谈大纲和问题已成功接收。")
            
            # 清空表单
            st.session_state.questions = [""]
            st.experimental_rerun()


#查看总结页面
def page_summary():
    st.title("查看访谈总结")
    
    # 读取 JSON 文件
    try:
        with open(parent_dir+"/interview_app/interview_summary.json", "r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        st.error("未找到 interview_summary.json 文件，请确保文件存在于当前目录！")
        st.stop()
    except json.JSONDecodeError:
        st.error("JSON 文件格式错误，请检查文件内容！")
        st.stop()
    
    # 展示 Takeaways 部分
    st.header("主要收获 (Takeaways)")
    st.write(data["takeaways"])

    # 展示 Points 和 Explanations 部分
    st.header("评分与说明 (Points & Explanations)")
    if len(data["points"]) == len(data["explanations"]):
        for i, (point, explanation) in enumerate(zip(data["points"], data["explanations"]), 1):
            st.subheader(f"要点 {i}")
            col1, col2 = st.columns([1, 4])  # 创建两列布局，调整比例以优化显示
            with col1:
                st.write(f"**评分**: {point}")
            with col2:
                st.write(f"**说明**: {explanation}")
    else:
        st.error("评分和说明的数量不匹配，请检查 JSON 数据！")

def main():
    #设置初始页面为Home
    session_state=st.session_state
    if 'page' not in session_state:
        session_state['page']='输入主题'
    
    st.sidebar.markdown("<h2>导航</h2>", unsafe_allow_html=True)
    #导航栏
    page = st.sidebar.selectbox(
        "请选择页面",
        ["输入主题", "查看总结"],
        index=0,  # 默认选中第一个选项
    )

    if page=='查看总结':
        page_summary()
    if page=='输入主题':
        page_input()
    

if __name__ == '__main__':
    main()