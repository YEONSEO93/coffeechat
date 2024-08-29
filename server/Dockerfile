FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server.js"]
