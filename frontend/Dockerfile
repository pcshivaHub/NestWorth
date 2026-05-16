FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx expo export --platform web

RUN npm install -g serve

CMD serve dist -p $PORT
