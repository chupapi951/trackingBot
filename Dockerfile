FROM node:20

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY start.js ./

RUN npm install && cd server && npm install

EXPOSE 4000

CMD ["node", "start.js"]