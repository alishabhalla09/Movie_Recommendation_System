FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/streamflix/package.json ./artifacts/streamflix/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/

RUN pnpm install

COPY . .

WORKDIR /app/artifacts/streamflix
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
