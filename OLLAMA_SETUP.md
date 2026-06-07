# 🚀 Ollama Setup - Guia Completo

## ✅ O que foi feito automaticamente:

### 1. **Código atualizado** (clips.functions.ts)
- ✅ Adicionado suporte para Ollama como 3ª opção de IA
- ✅ Ordem de verificação: Lovable → OpenAI → **Ollama (LOCAL/GRATUITO)**
- ✅ Parsing de respostas Ollama implementado

### 2. **Configuração do .env atualizada**
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### 3. **Scripts de automação criados**
- `setup-ollama.ps1` - Instalação automática
- `start-ollama.ps1` - Inicia o servidor

---

## 🔧 Próximos passos (MANUAL):

### **Passo 1: Baixar Ollama**
1. Vá para https://ollama.ai/download
2. Clique em "Download for Windows"
3. Salve o arquivo `.exe`

### **Passo 2: Instalar Ollama**
1. Abra o arquivo baixado
2. Clique em "Install"
3. Aguarde a conclusão (pode levar 2-3 minutos)

### **Passo 3: Baixar modelo Mistral**
Abra um **novo** PowerShell e execute:
```powershell
ollama pull mistral
```
⏳ Isso vai levar **10-15 minutos** na primeira vez (1.3GB de download)

### **Passo 4: Iniciar servidor Ollama**
Em um PowerShell separado, execute:
```powershell
ollama serve
```

✅ Pronto! Deixe este terminal aberto enquanto usa a app.

---

## 🎯 Como usar:

1. Mantenha `ollama serve` rodando em um terminal
2. Abra http://127.0.0.1:8081/ (ou https://hook-hustle-engine.lovable.app/)
3. Cole a transcrição do vídeo
4. Clique em **"ANALISAR CONTEÚDO"**
5. Agora vai usar **Ollama local** (gratuito!) 🎉

---

## 💡 Troubleshooting:

### "Ollama not found"
```powershell
# Tente instalar via Scoop
scoop install ollama

# Ou execute o script de setup
.\setup-ollama.ps1
```

### "Connection refused"
- Verifique se `ollama serve` está rodando
- Tente abrir http://localhost:11434/ no navegador
- Se não abrir, execute `ollama serve` novamente

### "Modelo não encontrado"
```powershell
# Baixe novamente
ollama pull mistral

# Ou use outro modelo
ollama pull llama2
```

---

## 📊 Comparação de Modelos:

| Modelo | Tamanho | Velocidade | Qualidade | RAM necessária |
|--------|---------|-----------|-----------|-----------------|
| **Mistral** | 7B | ⚡ Rápido | ⭐⭐⭐⭐ | 8GB |
| LLaMA2 | 7B | ⚡ Rápido | ⭐⭐⭐ | 8GB |
| Neural Chat | 7B | ⚡ Rápido | ⭐⭐⭐⭐ | 8GB |
| Llama2 13B | 13B | ⭐ Normal | ⭐⭐⭐⭐⭐ | 16GB |

---

## ✨ Benefícios do Ollama:

✅ **100% GRATUITO** - Sem cartão de crédito  
✅ **Offline** - Funciona sem internet (após download do modelo)  
✅ **Rápido** - Rodas localmente na sua máquina  
✅ **Privado** - Seus dados não saem do seu PC  
✅ **Sem limites** - Use quantas vezes quiser  

---

## 🎬 Quando estiver pronto:

Volte aqui e teste o botão **"ANALISAR CONTEÚDO"** com uma transcrição de vídeo. A IA local vai extrair os 5 melhores clipes virais!
