# Hook Hustle Engine

Aplicação web que analisa transcrições e gera sugestões de clipes virais para TikTok, Reels, Shorts e outras redes.

## O que foi adicionado

- `render_jobs` no backend: fila de jobs de renderização local
- botão **Renderizar no meu PC** no app web
- lista de status de jobs na página principal
- `worker.py`: script Python que faz polling no Supabase, baixa o vídeo com `yt-dlp`, corta com `ffmpeg` e atualiza o status do job
- SQL para criar a tabela no Supabase em `supabase/render_jobs.sql`

## Como usar

### 1. Criar a tabela no Supabase

No seu projeto Supabase, execute `supabase/render_jobs.sql` ou cole o SQL no editor de consultas SQL.

### 2. Configurar o app web

No Lovable, configure as variáveis de ambiente do projeto (não na seção de Secrets reservados):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (para o worker local)

> Importante: as variáveis que começam com `VITE_` são injetadas em tempo de build e devem estar configuradas no painel de variáveis de ambiente do Lovable ou em um arquivo de build, não em Secrets reservados.

### 3. Rodar o worker local

Instale as dependências do Python:

```bash
python -m pip install requests python-dotenv google-api-python-client google-auth-oauthlib google-auth-httplib2
```

Copie `.env.example` para `.env` e preencha os valores de produção ou crie um arquivo `.env` próximo a `worker.py` com:

```text
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CLIP_WORKER_OUTPUT_DIR=~/Videos/clipes
CLIP_WORKER_POLL_SECONDS=15
YOUTUBE_AUTO_PUBLISH=false
YOUTUBE_CLIENT_ID=<client-id-do-google>
YOUTUBE_CLIENT_SECRET=<client-secret-do-google>
YOUTUBE_REFRESH_TOKEN=<refresh-token-do-oauth>
YOUTUBE_PRIVACY_STATUS=private
```

Execute:

```bash
python worker.py
```

### 4. Fluxo de uso

1. Cole o link do vídeo ou transcrição no web app.
2. Clique em **Analisar conteúdo**.
3. Quando os clipes aparecerem, clique em **Renderizar no meu PC**.
4. O worker local irá baixar, cortar e salvar os MP4 em `CLIP_WORKER_OUTPUT_DIR`.
5. O status será atualizado no web app.

## Notas

- O worker local usa `yt-dlp` e `ffmpeg`, que devem estar instalados no seu PC.
- O `SUPABASE_SERVICE_ROLE_KEY` deve permanecer privado e ser usado apenas no worker local.
- Se quiser, posso também criar a versão Electron do worker.
