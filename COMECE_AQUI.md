# 🎬 ViralForce.AI - Setup Ollama (IA Local Gratuita)

## Status: ✅ Código Atualizado

O código da app foi atualizado para usar **Ollama** como IA gratuita!

### ✅ O que foi feito automaticamente:
- `src/lib/clips.functions.ts` - Adicionado suporte para Ollama
- `env.env` - Configurado com `OLLAMA_BASE_URL` e `OLLAMA_MODEL`
- Criados scripts e guias de instalação

### ⏳ O que você precisa fazer agora:

**Siga EXATAMENTE NESTA ORDEM:**

### 1️⃣ Instalar Ollama (5 minutos)
→ Leia: `INSTALACAO_MANUAL.md`

**Resumo rápido:**
```
1. Download: https://ollama.ai/download
2. Execute o instalador .exe como Administrador
3. Aguarde conclusão (2-3 minutos)
```

### 2️⃣ Baixar Modelo Mistral (15 minutos)
```powershell
ollama pull mistral
```

### 3️⃣ Iniciar Servers (3 terminais diferentes)

**Terminal 1 - App Local:**
```powershell
cd c:\Users\user\Desktop\hook-hustle-engine
npm run dev -- --port 8081
```

**Terminal 2 - Ollama Server:**
```powershell
ollama serve
```
*(Deixe rodando em background)*

**Terminal 3 - Worker (opcional, para YouTube):**
```powershell
cd c:\Users\user\Desktop\hook-hustle-engine
python worker.py
```

### 4️⃣ Usar a App
- Abra: http://127.0.0.1:8081/
- Cole uma transcrição
- Clique "ANALISAR CONTEÚDO"
- Aguarde a IA extrair 5 clipes virais! 🎉

---

## 📚 Documentos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `INSTALACAO_MANUAL.md` | **Leia isto primeiro** - Guia passo a passo |
| `OLLAMA_SETUP.md` | Troubleshooting e dicas avançadas |
| `setup-ollama.ps1` | Script de automação (se funcionar) |
| `start-ollama.ps1` | Inicia Ollama (shortcut) |

---

## 🔍 Verificar Se Tudo Está OK

```powershell
# Terminal 1: App rodando?
# http://127.0.0.1:8081 no navegador

# Terminal 2: Ollama rodando?
# Deve exibir: "Ollama is running on 127.0.0.1:11434"

# Terminal 3: Worker rodando?
# Deve exibir: "Worker starting... polling every 15 seconds"
```

---

## 🎯 Próximos Passos Após Instalar

1. ✅ Instale Ollama (siga `INSTALACAO_MANUAL.md`)
2. ✅ Teste a IA com "ANALISAR CONTEÚDO"
3. ✅ Se tudo funcionar, rode o worker (Terminal 3) para testar render + YouTube
4. ✅ Deploy em produção (já feito em https://hook-hustle-engine.lovable.app/)

---

## 💡 Por que Ollama?

✅ **Gratuito** - Sem cartão de crédito  
✅ **Rápido** - Roda localmente  
✅ **Offline** - Após download do modelo  
✅ **Privado** - Seus dados não saem do PC  
✅ **Sem limites** - Use quantas vezes quiser  

---

## ❓ Dúvidas?

Se algo não funcionar, veja:
- `INSTALACAO_MANUAL.md` → "Problemas?"
- `OLLAMA_SETUP.md` → "Troubleshooting"

**Boa sorte!** 🚀
