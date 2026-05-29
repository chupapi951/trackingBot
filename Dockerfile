FROM node:20

WORKDIR /app

COPY package*.json ./
COPY start.sh ./
COPY server ./server

RUN npm install && (cd server && npm install)

EXPOSE 4000

CMD ["bash", "start.sh"]