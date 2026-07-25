# AI面试助手 (AI Interview Assistant)

一款基于AI的智能面试管理系统，帮助HR自动化处理简历筛选、面试问题生成、面试安排和评估报告等流程。

## 🚀 功能特性

- **简历智能解析**：上传PDF简历，自动提取候选人信息、技能、工作经历等
- **AI问题生成**：基于简历和职位描述，自动生成个性化面试问题
- **邮件自动发送**：自动发送面试邀请和结果通知邮件
- **腾讯会议集成**：一键创建腾讯会议，自动安排面试时间
- **AI评估报告**：根据面试转录自动生成评估报告，包含多维度评分和推荐建议
- **可视化仪表盘**：直观展示面试进度、统计数据等

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express** - Web框架
- **Sequelize** - ORM数据库操作
- **MySQL** - 数据存储
- **通义千问API** - AI能力（简历解析、问题生成、报告生成）
- **腾讯会议API** - 会议创建与管理
- **Nodemailer** - 邮件发送

### 前端
- **React 18** - UI框架
- **Ant Design 5** - UI组件库
- **React Router 6** - 路由管理
- **Axios** - HTTP请求

## 📁 项目结构

```
interview-assistance/
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   └── database.js    # 数据库配置
│   │   ├── models/            # 数据模型
│   │   │   ├── resume.model.js
│   │   │   ├── jd.model.js
│   │   │   ├── interview.model.js
│   │   │   └── report.model.js
│   │   ├── services/          # 业务服务
│   │   │   ├── qwen.service.js    # 通义千问AI服务
│   │   │   ├── email.service.js   # 邮件服务
│   │   │   └── meeting.service.js # 腾讯会议服务
│   │   ├── routes/            # API路由
│   │   └── index.js           # 入口文件
│   ├── .env.example           # 环境变量示例
│   └── package.json
├── frontend/                   # 前端代码
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── Dashboard.js
│   │   │   ├── ResumeUpload.js
│   │   │   ├── InterviewList.js
│   │   │   ├── InterviewDetail.js
│   │   │   └── ReportDetail.js
│   │   ├── services/
│   │   │   └── api.js         # API服务
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── database/
│   └── init.sql               # 数据库初始化脚本
├── package.json               # 根项目配置
└── README.md
```

## ⚙️ 环境配置

### 1. 数据库配置
```bash
# 创建MySQL数据库
mysql -u root -p < database/init.sql
```

### 2. 后端环境变量
复制 `backend/.env.example` 为 `backend/.env` 并填写以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=interview_assistant
DB_USER=root
DB_PASSWORD=your_password

# 通义千问API
QWEN_API_KEY=your_qwen_api_key

# 邮件服务配置
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password

# 腾讯会议API
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_APP_ID=your_app_id
```

### 3. 前端环境变量（可选）
创建 `frontend/.env`：
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 🚀 快速开始

### 安装依赖
```bash
# 安装所有依赖
npm run install:all

# 或分别安装
npm run install:backend
npm run install:frontend
```

### 启动服务
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run backend    # 启动后端 (端口: 3001)
npm run frontend   # 启动前端 (端口: 3000)
```

### 访问应用
- 前端界面：http://localhost:3000
- 后端API：http://localhost:3001/api

## 📖 使用流程

1. **上传简历**：在"简历上传"页面上传PDF简历，系统自动解析候选人信息
2. **创建职位**：填写职位描述信息
3. **创建面试**：选择简历和职位，创建面试记录
4. **生成问题**：点击"生成问题"，AI自动生成面试问题
5. **确认问题**：审核并确认面试问题
6. **发送邀请**：系统自动发送面试邀请邮件
7. **安排会议**：创建腾讯会议，设置面试时间
8. **进行面试**：面试进行中
9. **生成报告**：面试结束后，AI自动生成评估报告

## 🔌 API接口

### 简历相关
- `POST /api/resume/upload` - 上传简历
- `GET /api/resume/list` - 获取简历列表
- `GET /api/resume/:id` - 获取简历详情

### 面试相关
- `POST /api/interview/create` - 创建面试
- `POST /api/interview/:id/generate-questions` - 生成面试问题
- `POST /api/interview/:id/confirm-questions` - 确认问题
- `POST /api/interview/:id/schedule` - 安排面试
- `GET /api/interview/list` - 获取面试列表

### 报告相关
- `POST /api/report/generate` - 生成报告
- `GET /api/report/list` - 获取报告列表

## 📝 开发说明

### 添加新的AI模型
修改 `backend/src/services/qwen.service.js`，可以替换为其他AI模型（如OpenAI、文心一言等）。

### 自定义邮件模板
修改 `backend/src/services/email.service.js` 中的邮件模板。

### 扩展会议平台
`backend/src/services/meeting.service.js` 提供了腾讯会议的集成，可以扩展支持其他会议平台。

## 🐳 Docker部署

### 快速启动（推荐）

```bash
# 1. 复制环境变量配置
cp .env.docker.example .env

# 2. 编辑 .env 文件，填写必要的配置

# 3. 启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

### Docker服务说明

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| mysql | interview-mysql | 3306 | MySQL 8.0 数据库 |
| backend | interview-backend | 3001 | Node.js 后端服务 |
| frontend | interview-frontend | 80 | Nginx 前端服务 |

### Docker常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重新构建
docker-compose up -d --build

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 进入容器
docker exec -it interview-backend sh
docker exec -it interview-mysql mysql -u root -p

# 清理所有数据（包括数据库）
docker-compose down -v
```

### 生产环境部署建议

1. **修改数据库密码**：在 `.env` 中设置强密码
2. **配置HTTPS**：使用 Let's Encrypt 或其他SSL证书
3. **设置域名**：修改 `frontend/nginx.conf` 中的 `server_name`
4. **备份数据**：定期备份 MySQL 数据卷
5. **日志管理**：配置日志收集系统

### 单独构建镜像

```bash
# 构建后端镜像
cd backend
docker build -t interview-backend .

# 构建前端镜像
cd frontend
docker build -t interview-frontend .
```

## 📄 License

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！
