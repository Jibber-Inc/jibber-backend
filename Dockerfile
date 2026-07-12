FROM node:22.22.0-bookworm-slim AS runtime-base

WORKDIR /code

# Schema migrations use Requests and PyMongo. Keep them in an isolated Python
# environment so the same image can run migrations against MongoDB 7.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv \
  && python3 -m venv /opt/jibber-python \
  && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/jibber-python/bin:${PATH}"

COPY requirements.txt ./
RUN pip install --no-cache-dir --requirement requirements.txt

COPY package.json package-lock.json ./

FROM runtime-base AS development

ENV NODE_ENV=development
RUN npm ci --ignore-scripts

COPY babel.config.js ./
COPY src ./src
COPY scripts ./scripts

EXPOSE 1337
CMD ["npm", "run", "dev:watch"]

FROM runtime-base AS build

ENV NODE_ENV=development
RUN npm ci --ignore-scripts

COPY babel.config.js ./
COPY src ./src

RUN npm run build \
  && npm prune --omit=dev

FROM runtime-base AS production

ENV NODE_ENV=production

COPY --from=build /code/node_modules ./node_modules
COPY --from=build /code/dist ./dist
COPY --from=build /code/src/schemas ./src/schemas
COPY scripts ./scripts

EXPOSE 1337
CMD ["npm", "start"]
