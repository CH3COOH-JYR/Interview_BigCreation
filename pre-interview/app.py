import streamlit as st
import json
from datetime import datetime

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

def main():
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

if __name__ == '__main__':
    main()