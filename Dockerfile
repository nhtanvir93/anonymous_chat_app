FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install

COPY . .

ARG PORT=3000
ENV PORT=$PORT

EXPOSE $PORT

CMD ["pnpm", "start:dev"]