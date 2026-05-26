FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG EXPO_PUBLIC_API_URL=https://nestworthsvc-production.up.railway.app
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web

RUN npm install -g serve

CMD serve dist -p $PORT
