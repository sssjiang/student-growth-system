import json
from werkzeug.security import generate_password_hash

from database import get_db, init_db


STUDENTS = [
    ("2026001", "林晓雨", "女", "高二", "2班", ["摄影", "绘画", "校园媒体"], "喜欢用相机记录校园生活，负责班级海报设计，有采访和图片编辑经验。", [(2024,1,82,78,86,80),(2024,2,85,80,88,82),(2025,1,88,83,90,84),(2025,2,91,86,92,87)]),
    ("2026002", "陈子昂", "男", "高二", "2班", ["篮球", "跑步", "团队活动"], "校篮球队后卫，坚持长跑，擅长团队协作和组织体育活动。", [(2024,1,76,84,78,75),(2024,2,78,86,80,76),(2025,1,79,89,82,78),(2025,2,81,91,84,80)]),
    ("2026003", "周思源", "女", "高二", "1班", ["编程", "机器人", "人工智能"], "参加过机器人竞赛，会 Python，喜欢研究人工智能与自动化项目。", [(2024,1,84,90,88,82),(2024,2,85,93,89,84),(2025,1,87,95,91,85),(2025,2,89,97,93,87)]),
    ("2026004", "何嘉言", "男", "高二", "1班", ["辩论", "演讲", "历史"], "校辩论队成员，关注历史和时事，愿意承担主持与公开表达任务。", [(2024,1,88,72,82,91),(2024,2,90,74,84,93),(2025,1,92,75,86,94),(2025,2,93,77,88,96)]),
    ("2026005", "苏沐晴", "女", "高一", "3班", ["志愿服务", "环保", "生物"], "长期参加社区志愿活动，关注环境保护，喜欢观察植物和自然。", [(2024,1,79,81,83,85),(2024,2,81,82,84,87),(2025,1,83,84,85,89),(2025,2,85,86,87,91)]),
    ("2026006", "顾庭安", "男", "高一", "3班", ["吉他", "音乐", "舞台表演"], "学习吉他五年，参加校园乐队，熟悉舞台演出和基础音频设备。", [(2024,1,86,79,85,78),(2024,2,84,81,87,80),(2025,1,85,80,89,82),(2025,2,87,82,91,83)]),
]


def seed():
    init_db()
    with get_db() as db:
        if db.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
            print("已有数据，跳过初始化。")
            return
        db.execute("INSERT INTO users(username,password_hash,role,display_name) VALUES(?,?,?,?)",
                   ("teacher", generate_password_hash("teacher123"), "teacher", "王老师"))
        for index, (number, name, gender, grade, class_name, tags, description, grades) in enumerate(STUDENTS, 1):
            user = db.execute("INSERT INTO users(username,password_hash,role,display_name) VALUES(?,?,?,?)",
                              (f"student{index}", generate_password_hash("student123"), "student", name))
            student = db.execute("INSERT INTO students(user_id,student_no,name,gender,grade,class_name,email,bio) VALUES(?,?,?,?,?,?,?,?)",
                                 (user.lastrowid, number, name, gender, grade, class_name,
                                  f"student{index}@school.edu.cn", description))
            db.execute("INSERT INTO interests(student_id,tags,description) VALUES(?,?,?)",
                       (student.lastrowid, json.dumps(tags, ensure_ascii=False), description))
            db.executemany("INSERT INTO grades(student_id,year,semester,chinese,math,english,politics) VALUES(?,?,?,?,?,?,?)",
                           [(student.lastrowid, *row) for row in grades])
    print("演示数据已创建。教师：teacher / teacher123；学生：student1 / student123")


if __name__ == "__main__":
    seed()
