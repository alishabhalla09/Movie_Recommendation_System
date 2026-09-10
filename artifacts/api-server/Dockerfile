FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/

RUN pnpm install

COPY . .

WORKDIR /app/artifacts/api-server
RUN pnpm run build

EXPOSE 5000
CMD ["pnpm", "run", "start"]
