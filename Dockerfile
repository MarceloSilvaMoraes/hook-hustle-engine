# Multi-stage build para Hook Hustle Engine
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    build-essential

# Copiar arquivos de dependency
COPY package*.json ./
RUN npm ci

# Copiar código
COPY . .

# Build
RUN npm run build

# ===== Imagem final =====
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de runtime
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    ca-certificates

# Instalar Rembg
RUN pip install rembg --break-system-packages

# Copiar arquivos necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Criar diretórios
RUN mkdir -p tmp/thumbnails

# Expor porta
EXPOSE 4173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4173', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start
CMD ["node", "dist/server/server.js"]
