FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package.json ./
RUN npm install --production

# 复制服务代码
COPY services/ ./services/
COPY deployments/ ./deployments/

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "services/platformProxy.js"]
