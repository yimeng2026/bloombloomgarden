FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    BACKEND_PORT=3001
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules/
COPY --from=build /app/dist ./dist/
COPY --from=build /app/prisma ./prisma/
# TypeScript does not copy JSON imports into dist.
COPY --from=build /app/src/config/providers.json ./dist/config/providers.json

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3001
CMD ["node", "dist/server.js"]
