# 后端 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源代码
COPY src/ ./src/

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["node", "src/index.js"]