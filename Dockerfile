# Multi-stage build para Hook Hustle Engine
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    build-base

# Copiar apenas os arquivos de dependency
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY components.json ./
COPY eslint.config.js ./

RUN npm install --ignore-scripts --legacy-peer-deps

# Copiar apenas o código
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Build
RUN npm run build

# ===== Imagem final =====
FROM node:22-alpine

WORKDIR /app

# Instalar dependências de runtime
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    ca-certificates

# Copiar apenas o necessário
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Criar diretórios
RUN mkdir -p tmp/thumbnails

# Expor porta
EXPOSE 4173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4173', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start
CMD ["node", "dist/server/server.js"]
