FROM node:20.19.0-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/event-os/package.json apps/event-os/package.json
COPY packages/foundation/package.json packages/foundation/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @maison-doclar/event-os build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @maison-doclar/foundation migrate && pnpm --filter @maison-doclar/event-os start"]
