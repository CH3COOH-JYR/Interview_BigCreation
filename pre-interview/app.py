from flask import Flask, render_template, request, redirect, url_for
import json
app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # 获取表单数据
        interview_outline = request.form['interview_outline']
        key_questions = request.form.getlist('key_questions')

        # 创建访谈大纲记录字典
        interview_record = {
            'interview_outline': interview_outline,
            'key_questions': key_questions
        }

        # 将访谈大纲记录保存为 JSON 格式，追加到文件末尾
        try:
            with open('interview_outline.json', 'a', encoding='utf-8') as file:
                # 在 JSON 数据之间添加一个分隔符，以便每次追加
                if file.tell() > 0:
                    file.write(',\n')
                json.dump(interview_record, file, ensure_ascii=False, indent=4)
        except FileNotFoundError:
            # 如果文件不存在，创建一个新的文件并添加 JSON 数据
            with open('interview_outline.json', 'w', encoding='utf-8') as file:
                json.dump([interview_record], file, ensure_ascii=False, indent=4)

        # 打印到控制台，可以进一步处理
        print("访谈大纲:", interview_outline)
        print("关键问题:", key_questions)

        # 提交后重定向到感谢页面
        return redirect(url_for('thank_you'))

    return render_template('index.html')


@app.route('/thank_you')
def thank_you():
    return render_template('thank_you.html')


if __name__ == '__main__':
    app.run(debug=True)