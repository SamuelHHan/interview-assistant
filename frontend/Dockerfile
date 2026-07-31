# 前端 Dockerfile - 生产构建模式
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY public/ ./public/
COPY src/ ./src/

# 设置环境变量
ENV NODE_ENV=production
ENV REACT_APP_API_URL=/api
ENV CI=true

# 构建生产版本
RUN npx react-scripts build

# 使用nginx提供静态文件
FROM nginx:alpine

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到nginx
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]