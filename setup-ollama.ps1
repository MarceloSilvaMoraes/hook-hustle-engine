# Setup Ollama para ViralForce.AI
# Este script faz download, instala e configura Ollama para usar como IA local gratuita

Write-Host "=== Configurando Ollama ===" -ForegroundColor Green

# 1. Tentar instalar via Scoop
Write-Host "`n[1/4] Tentando instalar Ollama via Scoop..."
try {
    scoop install ollama -ErrorAction SilentlyContinue
    Write-Host "✓ Ollama instalado via Scoop" -ForegroundColor Green
} catch {
    Write-Host "⚠ Scoop não disponível, tentando método alternativo..." -ForegroundColor Yellow
}

# 2. Baixar instalador direto se Scoop falhar
Write-Host "`n[2/4] Verificando se Ollama está disponível no PATH..."
$ollamaPath = (Get-Command ollama -ErrorAction SilentlyContinue).Source
if (-not $ollamaPath) {
    Write-Host "⚠ Ollama não encontrado. Fazendo download manual..."
    $tempDir = "$env:TEMP"
    $installerPath = "$tempDir\OllamaInstall.exe"
    
    Write-Host "Baixando Ollama de ollama.ai..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://ollama.ai/download/windows" `
            -OutFile $installerPath `
            -UseBasicParsing `
            -ErrorAction Stop
        
        Write-Host "✓ Download concluído" -ForegroundColor Green
        Write-Host "Executando instalador (por favor aguarde)..."
        & $installerPath
        Write-Host "✓ Instalador iniciado" -ForegroundColor Green
        Write-Host "`n⚠ IMPORTANTE: Conclua a instalação do Ollama clicando no wizard!" -ForegroundColor Yellow
    } catch {
        Write-Host "✗ Erro ao fazer download: $_" -ForegroundColor Red
        Write-Host "`nAlternativa: Faça download manual em https://ollama.ai/download" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✓ Ollama já está instalado em: $ollamaPath" -ForegroundColor Green
}

# 3. Aguardar um pouco e tentar iniciar Ollama
Write-Host "`n[3/4] Aguardando estabilização..."
Start-Sleep -Seconds 3

# 4. Tentar baixar modelo Mistral
Write-Host "`n[4/4] Fazendo download do modelo Mistral (pode levar alguns minutos)..."
try {
    & ollama pull mistral
    Write-Host "✓ Modelo Mistral baixado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Erro ao baixar modelo. Você pode fazer isso manualmente com:" -ForegroundColor Yellow
    Write-Host "   ollama pull mistral" -ForegroundColor Cyan
}

Write-Host "`n=== Setup Completo ===" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Abra um novo terminal PowerShell" -ForegroundColor White
Write-Host "2. Execute: ollama serve" -ForegroundColor White
Write-Host "3. Deixe rodando em background" -ForegroundColor White
Write-Host "4. A app vai usar Ollama automaticamente para análise de IA" -ForegroundColor White
Write-Host "`nSeu env.env já foi configurado com:" -ForegroundColor Cyan
Write-Host "   OLLAMA_BASE_URL=http://localhost:11434" -ForegroundColor White
Write-Host "   OLLAMA_MODEL=mistral" -ForegroundColor White
