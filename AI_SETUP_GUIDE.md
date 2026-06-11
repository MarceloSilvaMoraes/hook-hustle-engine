# 🤖 Guia de Configuração de IA - ViralForce.AI

O sistema precisa de **uma das 3 opções** para gerar clipes automaticamente:

---

## ✅ **Opção 1: OpenAI (RECOMENDADO - Mais Fácil)**

### Passos:
1. **Crie uma conta**: https://platform.openai.com/signup
2. **Vá para**: https://platform.openai.com/api/keys
3. **Clique**: "+ Create new secret key"
4. **Copie** a chave (começa com `sk-`)
5. **Cole no `.env`**:

```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

6. **Reinicie** o servidor dev (`npm run dev`)

### ✨ Vantagens:
- ✅ Mais rápido e preciso
- ✅ Funciona 100% online
- ✅ Gera clipes melhores
- ⚠️ **Uso pago** (~$0.01 por análise, 5 clipes)

### Configuração de Créditos:
- Crie $5 em créditos grátis na primeira vez
- https://platform.openai.com/account/billing/credits_grants

---

## 🆓 **Opção 2: Ollama (Gratuito - Instalar Localmente)**

### Passos:
1. **Baixe**: https://ollama.ai/download
2. **Instale** (Windows: next, next, finish)
3. **Abra PowerShell** e rode:
```powershell
ollama pull mistral
```
(⏳ ~2-3 minutos para baixar o modelo)

4. **Mantém rodando** em outra janela:
```powershell
ollama serve
```

5. **Deixe na porta 11434** (padrão)

6. **Volte ao terminal anterior** e rode:
```bash
npm run dev
```

### ✨ Vantagens:
- ✅ 100% gratuito
- ✅ Funciona offline
- ⚠️ Mais lento (30-60s por análise)
- ⚠️ Qualidade menor nos clipes

### Instalação Rápida no PowerShell:
```powershell
# Baixar e instalar Ollama
Invoke-WebRequest -Uri "https://ollama.ai/download/windows" -OutFile "ollama-installer.exe"
.\ollama-installer.exe
```

---

## 🎨 **Opção 3: Lovable AI (Profissional)**

### Passos:
1. **Vá para**: https://lovable.dev (crie conta ou faça login)
2. **Abra Settings** → API Keys
3. **Gere uma chave** de API
4. **Cole no `.env`**:

```env
LOVABLE_API_KEY=seu-token-aqui
```

5. **Reinicie** o servidor

### ✨ Vantagens:
- ✅ Muito preciso
- ✅ Integrado com o Lovable
- ⚠️ Pode ter cota limitada

---

## 📋 Comparação Rápida

| Recurso | OpenAI | Ollama | Lovable |
|---------|--------|--------|---------|
| **Custo** | ~$0.01/análise | Grátis | Depende |
| **Velocidade** | ⚡ Rápido (5-10s) | 🐢 Lento (30-60s) | ⚡ Rápido |
| **Qualidade** | 🌟 Excelente | ⭐ Boa | 🌟 Excelente |
| **Sem Internet** | ❌ Não | ✅ Sim | ❌ Não |
| **Setup** | 2 min | 5 min | 2 min |

---

## 🚀 **Próximos Passos**

Depois de configurar **uma das 3 opções**:

1. ✅ Reinicie o servidor (`npm run dev`)
2. ✅ Volte para http://localhost:8081
3. ✅ Cole um link do YouTube
4. ✅ Clique em "⚡ ANALISAR CONTEÚDO"
5. ✅ Aguarde 5-60 segundos
6. ✅ 5 clipes virais aparecem automaticamente!

---

## ⚠️ **Troubleshooting**

**P: Erro "Não consegui conectar ao Ollama"**
- A: Certifique-se que Ollama está rodando: `ollama serve`

**P: Erro "Nenhuma chave de IA configurada"**
- A: Escolha uma opção acima e configure no `.env`

**P: Erro "Créditos esgotados" (OpenAI)**
- A: Receba mais créditos: https://platform.openai.com/account/billing/overview

---

## 💡 **Recomendação Final**

🎯 **Use OpenAI** se:
- Quer melhor qualidade
- Tem alguns centavos de crédito
- Quer velocidade

🎯 **Use Ollama** se:
- Quer totalmente gratuito
- Pode esperar mais
- Tem internet lenta

---

**Dúvidas?** Veja a transcrição completa do .env para outras variáveis disponíveis.
