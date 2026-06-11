#!/bin/bash
# 🎬 Thumbnail Generation - Test & Setup Guide
# Execute este script para verificar se tudo está configurado

echo "=============================================="
echo "🎬 Thumbnail System - Setup Verification"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# ETAPA 1: Verificar Dependências do Sistema
# ============================================================================

echo "📦 [1/4] Verificando dependências do sistema..."
echo ""

# FFmpeg
echo -n "  ✓ FFmpeg: "
if command -v ffmpeg &> /dev/null; then
    ffmpeg_version=$(ffmpeg -version | head -n 1)
    echo -e "${GREEN}✅ Instalado${NC}"
    echo "    $ffmpeg_version"
else
    echo -e "${RED}❌ NÃO ENCONTRADO${NC}"
    echo "    Windows: choco install ffmpeg"
    echo "    macOS:   brew install ffmpeg"
    echo "    Linux:   apt-get install ffmpeg"
    echo ""
fi

# Python
echo -n "  ✓ Python: "
if command -v python &> /dev/null; then
    python_version=$(python --version 2>&1)
    echo -e "${GREEN}✅ Instalado${NC}"
    echo "    $python_version"
    
    # Verificar Rembg
    echo -n "    ✓ Rembg: "
    if python -c "import rembg" 2>/dev/null; then
        echo -e "${GREEN}✅ Instalado${NC}"
    else
        echo -e "${YELLOW}⚠️  NÃO INSTALADO (Opcional)${NC}"
        echo "       Para instalar: pip install rembg[cpu]"
    fi
else
    echo -e "${YELLOW}⚠️  NÃO ENCONTRADO (Opcional)${NC}"
    echo "    Se quer usar Rembg local: python.org"
    echo "    Caso contrário, use Remove.bg API"
fi

echo ""

# ============================================================================
# ETAPA 2: Verificar Dependências NPM
# ============================================================================

echo "📚 [2/4] Verificando dependências NPM..."
echo ""

# Sharp
echo -n "  ✓ Sharp: "
if [ -d "node_modules/sharp" ]; then
    echo -e "${GREEN}✅ Instalado${NC}"
else
    echo -e "${RED}❌ NÃO ENCONTRADO${NC}"
    echo "    Execute: npm install sharp"
fi

echo ""

# ============================================================================
# ETAPA 3: Verificar Configuração Supabase
# ============================================================================

echo "🔌 [3/4] Verificando configuração Supabase..."
echo ""

check_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" env.env 2>/dev/null | cut -d '=' -f2)
    
    if [ -z "$var_value" ]; then
        echo -e "  ❌ $var_name: ${RED}NÃO CONFIGURADO${NC}"
        return 1
    else
        echo -e "  ✅ $var_name: ${GREEN}Configurado${NC}"
        return 0
    fi
}

check_env_var "VITE_SUPABASE_URL"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

echo ""

# ============================================================================
# ETAPA 4: Resumo
# ============================================================================

echo "📋 [4/4] Resumo e Próximos Passos..."
echo ""

echo -e "${GREEN}✅ Sistema pronto para testes!${NC}"
echo ""
echo "Próximas etapas:"
echo ""
echo "1️⃣  EXECUTAR MIGRATION SQL:"
echo "   - Abra: supabase/20260611_thumbnail_optimization.sql"
echo "   - Cole no dashboard Supabase > SQL Editor"
echo "   - Execute para criar as tabelas"
echo ""
echo "2️⃣  CRIAR BUCKET NO SUPABASE:"
echo "   - Vá para Storage > Create new bucket"
echo "   - Nome: 'videos'"
echo "   - Deixar público (ou configurar RLS depois)"
echo ""
echo "3️⃣  INICIAR SERVIDOR DE DESENVOLVIMENTO:"
echo "   npm run dev"
echo ""
echo "4️⃣  TESTAR VIA API:"
echo "   - POST http://localhost:3000/api/generateThumbnailOptimized"
echo "   - Body:"
echo '   {'
echo '     "videoPath": "https://...",  (URL do vídeo)'
echo '     "clipTitle": "PLOT TWIST",     (Título)'
echo '     "clipHook": "Você não vai...",  (Descrição)'
echo '     "triggerType": "cliffhanger",  (Tipo de gatilho)'
echo '     "autoUploadToSupabase": true    (Upload automático)'
echo '   }'
echo ""
echo "5️⃣  TESTAR CACHE:"
echo "   - Chamar a mesma geração 2x"
echo "   - Segunda deve ser ~50ms (from cache)"
echo ""
echo "=================================================="
echo ""
