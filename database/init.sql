-- AI面试助手数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS interview_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE interview_assistant;

-- 简历表
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_name VARCHAR(100) NOT NULL COMMENT '候选人姓名',
    candidate_email VARCHAR(255) NOT NULL COMMENT '候选人邮箱',
    candidate_phone VARCHAR(50) COMMENT '候选人电话',
    file_path VARCHAR(500) COMMENT '简历文件路径',
    skills JSON COMMENT '技能列表',
    experience JSON COMMENT '工作经历',
    education JSON COMMENT '教育背景',
    summary TEXT COMMENT '简历摘要',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (candidate_email),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='简历信息表';

-- 职位描述表
CREATE TABLE IF NOT EXISTS job_descriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '职位名称',
    company VARCHAR(200) COMMENT '公司名称',
    department VARCHAR(100) COMMENT '部门',
    description TEXT COMMENT '职位描述',
    requirements TEXT COMMENT '任职要求',
    required_skills JSON COMMENT '技能要求',
    experience_years VARCHAR(50) COMMENT '经验要求',
    salary_range VARCHAR(100) COMMENT '薪资范围',
    location VARCHAR(100) COMMENT '工作地点',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_company (company)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职位描述表';

-- 面试表
CREATE TABLE IF NOT EXISTS interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL COMMENT '简历ID',
    jd_id INT NOT NULL COMMENT '职位描述ID',
    status ENUM('pending', 'questions_generated', 'confirmed', 'email_sent', 'in_progress', 'completed') DEFAULT 'pending' COMMENT '面试状态',
    scheduled_time DATETIME COMMENT '面试时间',
    duration INT DEFAULT 20 COMMENT '面试时长(分钟)',
    meeting_id VARCHAR(100) COMMENT '腾讯会议ID',
    meeting_url VARCHAR(500) COMMENT '会议链接',
    transcript TEXT COMMENT '面试转录',
    recording_url VARCHAR(500) COMMENT '录音链接',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (jd_id) REFERENCES job_descriptions(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试信息表';

-- 面试问题表
CREATE TABLE IF NOT EXISTS interview_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interview_id INT NOT NULL COMMENT '面试ID',
    question TEXT NOT NULL COMMENT '问题内容',
    category VARCHAR(50) COMMENT '问题类别',
    difficulty VARCHAR(20) COMMENT '难度等级',
    order_index INT DEFAULT 0 COMMENT '问题顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    INDEX idx_interview (interview_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试问题表';

-- 面试报告表
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interview_id INT NOT NULL UNIQUE COMMENT '面试ID',
    overall_score DECIMAL(3,1) COMMENT '综合评分(0-10)',
    technical_score DECIMAL(3,1) COMMENT '技术能力评分',
    communication_score DECIMAL(3,1) COMMENT '沟通能力评分',
    problem_solving_score DECIMAL(3,1) COMMENT '问题解决评分',
    teamwork_score DECIMAL(3,1) COMMENT '团队协作评分',
    recommendation ENUM('强烈推荐', '推荐', '待定', '不推荐') COMMENT '推荐结果',
    strengths JSON COMMENT '优势列表',
    improvements JSON COMMENT '改进建议',
    summary TEXT COMMENT '综合评价',
    report_url VARCHAR(500) COMMENT '报告文件链接',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    INDEX idx_score (overall_score),
    INDEX idx_recommendation (recommendation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试报告表';

-- 插入示例数据
-- 示例简历
INSERT INTO resumes (candidate_name, candidate_email, candidate_phone, skills, summary) VALUES
('张三', 'zhangsan@example.com', '13800138001', '["JavaScript", "React", "Node.js", "TypeScript"]', '5年前端开发经验，熟悉React技术栈'),
('李四', 'lisi@example.com', '13800138002', '["Python", "Django", "PostgreSQL", "Docker"]', '3年后端开发经验，专注于Python开发');

-- 示例职位描述
INSERT INTO job_descriptions (title, company, description, required_skills, experience_years, location) VALUES
('高级前端工程师', '科技有限公司', '负责公司核心产品的前端开发工作', '["React", "TypeScript", "Node.js"]', '3-5年', '北京'),
('Python开发工程师', '互联网公司', '负责后端API开发和系统维护', '["Python", "Django", "PostgreSQL"]', '2-3年', '上海');

-- 示例面试
INSERT INTO interviews (resume_id, jd_id, status) VALUES
(1, 1, 'pending'),
(2, 2, 'pending');