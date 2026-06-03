# Histórico de Testes e Comandos

## Contexto
Projeto: `hook-hustle-engine`

- Área principal: app React/Vite + Supabase + worker Python
- Objetivo: criar jobs de renderização para vídeos do YouTube e processá-los localmente
- Tabela usada: `public.render_jobs`

## Passos realizados

### 1. Verificar acesso ao Supabase
Comando usado para testar a API e a chave `service_role`:

```powershell
python -c "from pathlib import Path; import requests; env={}; [env.update({k.strip():v.strip()}) for line in Path('.env').read_text().splitlines() if line.strip() and not line.strip().startswith('#') for k,v in [line.split('=',1)]]; url=env['SUPABASE_URL'] + '/rest/v1/render_jobs?select=*&limit=1'; headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_ROLE_KEY']}; r=requests.get(url, headers=headers, timeout=15); print(r.status_code); print(r.text)"
```

Resultado: `200 []` — chave válida, mas não havia jobs pendentes.

### 2. Inserir job de teste no Supabase
Comando para criar um job de renderização:

```powershell
python -c "from pathlib import Path; import json, requests; env={}; [env.update({k.strip():v.strip()}) for line in Path('.env').read_text().splitlines() if line.strip() and not line.strip().startswith('#') for k,v in [line.split('=',1)]]; url=env['SUPABASE_URL'] + '/rest/v1/render_jobs'; headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_ROLE_KEY'], 'Content-Type': 'application/json', 'Prefer': 'return=representation'}; job={'video_url':'https://www.youtube.com/watch?v=dQw4w9WgXcQ','platform':'youtube','render_format':'9:16','clip_items':[{'startTimestamp':'00:00:05','endTimestamp':'00:00:15','title':'teste'}],'instructions':'teste de renderização'}; r=requests.post(url, headers=headers, json=[job], timeout=15); print(r.status_code); print(r.text)"
```

Resultado: job criado com `status: pending`.

### 3. Rodar o worker local
Comando:

```powershell
python worker.py
```

O worker realizou o fluxo:
- buscou job pendente
- baixou o vídeo com `yt-dlp`
- processou com `ffmpeg`
- marcou o job como `done`

### 4. Ajustes no `worker.py`
Corrigido bug onde o worker passava a pasta em vez do arquivo baixado para o `ffmpeg`.

Trecho alterado em `worker.py`:

```python
workspace = OUTPUT_DIR / job_id
workspace.mkdir(parents=True, exist_ok=True)
video_file = download_video(job["video_url"], workspace)

rendered_files = []
clip_items = job.get("clip_items") or []
for index, clip in enumerate(clip_items, start=1):
    rendered = render_clip(video_file, clip, OUTPUT_DIR)
    rendered_files.append(str(rendered))
```

Também ajustado o filtro `ffmpeg` para evitar erro de `crop` em vídeos menores:

```python
def build_ffmpeg_filters() -> str:
    return (
        "scale='if(gt(a,9/16),1080,-2)':'if(gt(a,9/16),-2,1920)',"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
    )
```

## Comandos úteis

### Iniciar frontend local
```powershell
npm install
npm run dev
```

### Verificar últimos jobs no Supabase
```powershell
python -c "from pathlib import Path; import requests; env={}; [env.update({k.strip():v.strip()}) for line in Path('.env').read_text().splitlines() if line.strip() and not line.strip().startswith('#') for k,v in [line.split('=',1)]]; url=env['SUPABASE_URL'] + '/rest/v1/render_jobs?select=*&order=created_at.desc&limit=10'; headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_ROLE_KEY']}; r=requests.get(url, headers=headers, timeout=15); print(r.status_code); print(r.text)"
```

### Comando para criar job de teste novamente
```powershell
python -c "from pathlib import Path; import json, requests; env={}; [env.update({k.strip():v.strip()}) for line in Path('.env').read_text().splitlines() if line.strip() and not line.strip().startswith('#') for k,v in [line.split('=',1)]]; url=env['SUPABASE_URL'] + '/rest/v1/render_jobs'; headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_ROLE_KEY'], 'Content-Type': 'application/json', 'Prefer': 'return=representation'}; job={'video_url':'https://www.youtube.com/watch?v=dQw4w9WgXcQ','platform':'youtube','render_format':'9:16','clip_items':[{'startTimestamp':'00:00:05','endTimestamp':'00:00:15','title':'teste'}],'instructions':'teste de renderização'}; r=requests.post(url, headers=headers, json=[job], timeout=15); print(r.status_code); print(r.text)"
```

## Resultado final
- O sistema local está funcionando.
- O worker local já processou um job com sucesso.
- Agora é possível testar tanto pela interface web quanto usando o worker local.

## Observações
- O arquivo gerado no teste foi:
  - `C:\Users\SETOR T.I\Videos\clipes\teste_00-00-05_00-00-15.mp4`
- O backend Supabase usado pelo projeto é:
  - `https://njdzgzlkqjixdygbmvlo.supabase.co`

---

Este arquivo pode ser enviado ao GitHub como documentação do debug e do fluxo de teste do projeto.
