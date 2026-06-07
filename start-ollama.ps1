# Inicia Ollama Server para ViralForce.AI
# Execute este script para rodar o servidor Ollama localmente

Write-Host "=== Iniciando Ollama Server ===" -ForegroundColor Green
Write-Host "`nServidor Ollama vai rodar em: http://localhost:11434" -ForegroundColor Cyan
Write-Host "Deixe este terminal aberto enquanto usa a app" -ForegroundColor Yellow
Write-Host "`nPressione CTRL+C para parar o servidor`n" -ForegroundColor Gray

try {
    & ollama serve
} catch {
    Write-Host "`n✗ Erro: Ollama não está instalado" -ForegroundColor Red
    Write-Host "`nExecute primeiro: .\setup-ollama.ps1" -ForegroundColor Yellow
    exit 1
}
