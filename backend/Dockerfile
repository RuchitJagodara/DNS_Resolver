FROM node:18-alpine

# Install dig (bind-tools) for DNS queries
RUN apk add --no-cache bind-tools

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY backend ./backend

EXPOSE 5001

CMD ["node", "backend/src/server.js"]

