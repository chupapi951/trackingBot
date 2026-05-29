FROM node:20

WORKDIR /app

COPY package*.json ./
COPY server ./server
COPY start.js ./

RUN npm install

EXPOSE 4000

CMD ["node", "start.js"]