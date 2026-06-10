"""Local worker for render_jobs stored in Supabase."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    from requests import request
except ImportError:
    print("Missing dependencies. Install with: python -m pip install requests python-dotenv")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
OUTPUT_DIR = Path(os.environ.get("CLIP_WORKER_OUTPUT_DIR", "~/Videos/clipes")).expanduser()
POLL_SECONDS = int(os.environ.get("CLIP_WORKER_POLL_SECONDS", "15"))
WORKER_ID = os.environ.get("CLIP_WORKER_ID", f"local-worker-{os.getpid()}")
YOUTUBE_AUTO_PUBLISH = os.environ.get("YOUTUBE_AUTO_PUBLISH", "false").lower() in ("1", "true", "yes", "on")
YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN")
YOUTUBE_PRIVACY_STATUS = os.environ.get("YOUTUBE_PRIVACY_STATUS", "private")
APPLY_ANTI_BLOCK = os.environ.get("APPLY_ANTI_BLOCK", "true").lower() in ("1", "true", "yes", "on")
VIDEO_VERTICAL_STYLE = os.environ.get("VIDEO_VERTICAL_STYLE", "blurred").lower()


if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in environment.")
    sys.exit(1)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

JOB_TABLE = "render_jobs"


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def fetch_pending_job() -> dict | None:
    # First, check for rendering jobs (pending)
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?select=*&status=eq.pending&order=created_at.asc&limit=1"
    response = request("GET", url, headers=HEADERS)
    response.raise_for_status()
    data = response.json()
    if data:
        return data[0]
    
    # Then check for YouTube publish requests (published_requested)
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?select=*&status=eq.published_requested&order=created_at.asc&limit=1"
    response = request("GET", url, headers=HEADERS)
    response.raise_for_status()
    data = response.json()
    return data[0] if data else None


def claim_job(job_id: str, current_status: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?id=eq.{job_id}&status=eq.{current_status}"
    body = {
        "status": "in_progress",
        "worker_id": WORKER_ID,
        "locked_at": utc_now_iso(),
    }
    response = request("PATCH", url, headers=HEADERS, data=json.dumps(body))
    response.raise_for_status()
    return response.json() != []


def update_job(job_id: str, updates: dict) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?id=eq.{job_id}"
    response = request("PATCH", url, headers=HEADERS, data=json.dumps(updates))
    response.raise_for_status()


def get_missing_youtube_config(custom_refresh_token: str | None = None) -> list[str]:
    missing: list[str] = []
    if not YOUTUBE_AUTO_PUBLISH and not custom_refresh_token:
        missing.append("YOUTUBE_AUTO_PUBLISH=true")
    if not YOUTUBE_CLIENT_ID:
        missing.append("YOUTUBE_CLIENT_ID")
    if not YOUTUBE_CLIENT_SECRET:
        missing.append("YOUTUBE_CLIENT_SECRET")
    if not YOUTUBE_REFRESH_TOKEN and not custom_refresh_token:
        missing.append("YOUTUBE_REFRESH_TOKEN")
    return missing


def get_youtube_service(custom_refresh_token: str | None = None):
    if not YOUTUBE_AUTO_PUBLISH and not custom_refresh_token:
        return None
    
    refresh_token = custom_refresh_token or YOUTUBE_REFRESH_TOKEN
    if not all([YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, refresh_token]):
        return None

    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("youtube", "v3", credentials=credentials)


def upload_clip_to_youtube(file_path: Path, clip: dict, job: dict | None = None) -> str:
    custom_refresh_token = None
    custom_privacy_status = YOUTUBE_PRIVACY_STATUS
    custom_hashtags: list[str] = []
    custom_tags: list[str] = []
    
    if job:
        instructions_str = job.get("instructions")
        if instructions_str and instructions_str.strip().startswith("{"):
            try:
                config = json.loads(instructions_str)
                if isinstance(config, dict):
                    custom_refresh_token = config.get("youtube_refresh_token")
                    custom_privacy_status = config.get("privacy_status", YOUTUBE_PRIVACY_STATUS)
                    
                    hashtags_raw = config.get("default_hashtags", "")
                    tags_raw = config.get("default_tags", "")
                    
                    if hashtags_raw:
                        custom_hashtags = [h.strip() for h in hashtags_raw.split(",") if h.strip()]
                    if tags_raw:
                        custom_tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
            except Exception as e:
                print("Error parsing job instructions JSON config:", e)

    service = get_youtube_service(custom_refresh_token)
    if service is None:
        missing_config = get_missing_youtube_config(custom_refresh_token)
        missing_text = ", ".join(missing_config)
        raise RuntimeError(f"YouTube auto-publish não está configurado. Faltando: {missing_text}")

    from googleapiclient.http import MediaFileUpload
    import re

    # 1. Optimize Title for CTR (Click-Through Rate)
    raw_title = (clip.get("title") or "Clip gerado pelo Hook Hustle Engine").strip()
    
    # Select a contextual emoji based on clip triggers
    triggers = clip.get("triggers") or []
    emoji = " 😱"
    if "humor" in triggers:
        emoji = " 😂"
    elif "controversy" in triggers:
        emoji = " 🤯"
    elif "hook" in triggers:
        emoji = " 👀"
    elif "emotional" in triggers:
        emoji = " ❤️"

    # Add emoji to the title if it doesn't already end with punctuation or emoji
    if not re.search(r"[\u2600-\u27BF\u1F300-\u1F9FF!?!.]$", raw_title):
        raw_title += emoji
    
    title = raw_title.strip()[:100]

    # 2. Build high-converting SEO Description
    hook = (clip.get("hookQuote") or "").strip()
    justification = (clip.get("justification") or "").strip()
    
    desc_lines = []
    if hook:
        desc_lines.append(f'"{hook.upper()}" 🚀')
        desc_lines.append("")
    if justification:
        desc_lines.append(justification)
        desc_lines.append("")
        
    desc_lines.append("📌 Inscreva-se no canal para não perder os próximos cortes virais!")
    desc_lines.append("🔔 Deixe seu like e ative as notificações para apoiar o canal.")
    desc_lines.append("")
    
    # Generate relevant hashtags based on triggers
    hashtags = ["#shorts", "#viral", "#corte"]
    if custom_hashtags:
        hashtags.extend(custom_hashtags)
    else:
        for t in triggers:
            if t == "humor":
                hashtags.extend(["#humor", "#engraçado", "#comedia"])
            elif t == "controversy":
                hashtags.extend(["#polemica", "#debate", "#reflexao"])
            elif t == "emotional":
                hashtags.extend(["#motivacao", "#inspiracao", "#superacao"])
            elif t == "cliffhanger":
                hashtags.extend(["#curiosidade", "#suspense", "#fatos"])
            
    desc_lines.append(" ".join(list(set(hashtags))))
    description = "\n".join(desc_lines).strip()[:5000]

    # 3. Optimize tags for SEO searchability
    tags_list = [t.strip() for t in triggers if t] + ["cortes", "viral", "shorts", "retencao", "hookhustle"]
    if custom_tags:
        tags_list.extend(custom_tags)
    tags = list(set(tags_list))[:50]

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": custom_privacy_status,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(str(file_path), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)
    response = request.execute()
    return f"https://www.youtube.com/watch?v={response['id']}"




def sanitize_filename(text: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "-_ ." else "_" for ch in text)
    return safe.strip().replace(" ", "_")[:120] or "clip"


def parse_timestamp(ts: str) -> str:
    parts = [int(p) for p in ts.split(":") if p.isdigit()]
    if len(parts) == 3:
        return f"{parts[0]:02d}:{parts[1]:02d}:{parts[2]:02d}"
    if len(parts) == 2:
        return f"00:{parts[0]:02d}:{parts[1]:02d}"
    return f"00:00:{parts[0]:02d}" if parts else "00:00:00"


def run_command(command: list[str]) -> None:
    print("$", " ".join(command))
    subprocess.run(command, check=True)


def download_video(video_url: str, destination: Path) -> Path:
    output_file = destination / "source_video.%(ext)s"
    run_command(["yt-dlp", "-f", "mp4", "-o", str(output_file), video_url])
    matches = list(destination.glob("source_video.*"))
    if not matches:
        raise RuntimeError("Não foi possível baixar o arquivo de vídeo.")
    return matches[0]


def render_clip(source_path: Path, clip: dict, output_dir: Path) -> Path:
    start = parse_timestamp(clip["startTimestamp"])
    end = parse_timestamp(clip["endTimestamp"])
    title = sanitize_filename(clip.get("title", "clip"))
    output_file = output_dir / f"{title}_{start.replace(':', '-')}_{end.replace(':', '-')}.mp4"

    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        start,
        "-to",
        end,
        "-i",
        str(source_path),
    ]

    # Build video filtergraph
    if VIDEO_VERTICAL_STYLE == "blurred":
        # Background stack: upscale to fill canvas, blur, then overlay original video scaled to width
        v_filter = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:20[bg];"
            "[0:v]scale=1080:-2[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
        if APPLY_ANTI_BLOCK:
            # Subtle speed up (1.01x) and micro color contrast adjustments to bypass duplication detection
            v_filter += ",setpts=PTS/1.01,eq=contrast=1.01:brightness=0.005"
        v_filter += "[v]"
        cmd.extend(["-filter_complex", v_filter, "-map", "[v]", "-map", "0:a"])
    else:
        # Traditional black padding style
        v_filter = (
            "scale='if(gt(a,9/16),1080,-2)':'if(gt(a,9/16),-2,1920)',"
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
        )
        if APPLY_ANTI_BLOCK:
            v_filter += ",setpts=PTS/1.01,eq=contrast=1.01:brightness=0.005"
        cmd.extend(["-vf", v_filter])

    # Build audio filters and metadata stripping
    if APPLY_ANTI_BLOCK:
        cmd.extend([
            "-af", "atempo=1.01",
            "-map_metadata", "-1"
        ])

    cmd.extend([
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        str(output_file),
    ])

    run_command(cmd)
    return output_file



def publish_tiktok_flow(files_to_publish: list[Path], clip_items: list[dict], tiktok_config: dict, job_id: str, clip_index: int | None = None) -> None:
    import webbrowser
    
    print("\nOpening TikTok Creator Studio upload page...")
    webbrowser.open("https://www.tiktok.com/creator-center/upload?from=upload")
    
    # Build a nice caption text with hashtags to copy to clipboard
    caption_lines = []
    clips_to_process = [clip_items[clip_index]] if (clip_index is not None and clip_index < len(clip_items)) else clip_items
    
    for i, clip in enumerate(clips_to_process):
        idx = clip_index if clip_index is not None else i
        hook = (clip.get("hookQuote") or "").strip()
        title = (clip.get("title") or "").strip()
        
        # Combine hashtags
        tags = ["#shorts", "#tiktok", "#viral"]
        custom_hashtags_str = tiktok_config.get("default_hashtags", "")
        if custom_hashtags_str:
            tags.extend([h.strip() for h in custom_hashtags_str.split(",") if h.strip()])
        unique_tags = list(set(tags))
        
        caption = f"{title}\n\n\"{hook}\"\n\n{' '.join(unique_tags)}"
        caption_lines.append(caption)
        
        # Print caption to terminal
        print(f"\n[LEGENDAS DO CLIPE {idx+1}] (A primeira foi copiada automaticamente):")
        print(caption)
        print("-" * 45)
        
    # Copy the first clip's caption to clipboard
    if caption_lines:
        first_caption = caption_lines[0].strip()
        try:
            # Copy via Windows clip command
            process = subprocess.Popen('clip', stdin=subprocess.PIPE, shell=True)
            process.communicate(input=first_caption.encode('utf-8'))
            print("Legenda do clipe copiada para a area de transferencia!")
        except Exception as clip_err:
            print("Failed to copy to clipboard:", clip_err)

    # Open the file's folder and select the file
    if files_to_publish:
        file_idx = clip_index if (clip_index is not None and clip_index < len(files_to_publish)) else 0
        if file_idx is not None and file_idx < len(files_to_publish):
            first_file = files_to_publish[file_idx]
            if first_file and first_file.exists():
                try:
                    print(f"Revealing file in Explorer: {first_file}")
                    subprocess.run(["explorer.exe", "/select,", str(first_file)])
                except Exception as explorer_err:
                    print("Failed to open Explorer:", explorer_err)

    # Update clip_items
    tiktok_profile_name = tiktok_config.get('tiktok_profile_name', 'TikTok')
    if clip_index is not None and clip_index < len(clip_items):
        clip_items[clip_index]["tiktok_profile"] = tiktok_profile_name
    else:
        for clip in clip_items:
            clip["tiktok_profile"] = tiktok_profile_name

    # Update job to completed status with a message showing it was sent to TikTok
    original_paths = " | ".join(str(f) for f in files_to_publish if f)
    new_output = f"{original_paths} | TikTok: {tiktok_profile_name} (Aguardando upload no Creator Studio. Legenda copiada!)"
    
    update_job(job_id, {
        "status": "completed",
        "output_path": new_output,
        "completed_at": utc_now_iso(),
        "error_message": None,
        "clip_items": clip_items,
    })
    print(f"TikTok publish flow for job {job_id} handled successfully.\n")


def process_render_job(job: dict) -> None:
    """Process a rendering job (status: pending)."""
    job_id = job["id"]
    print(f"Processing render job: {job_id}")
    
    workspace = OUTPUT_DIR / job_id
    workspace.mkdir(parents=True, exist_ok=True)
    
    update_job(job_id, {"output_path": "Progress: Baixando vídeo original do YouTube..."})
    video_file = download_video(job["video_url"], workspace)

    rendered_files = []
    clip_items = job.get("clip_items") or []
    for i, clip in enumerate(clip_items):
        progress_text = f"Progress: Renderizando clipe {i+1} de {len(clip_items)}..."
        print(progress_text)
        update_job(job_id, {"output_path": progress_text})
        
        rendered = render_clip(video_file, clip, OUTPUT_DIR)
        clip["local_path"] = str(rendered)  # Save the rendered local path
        rendered_files.append(rendered)

    # Check if instructions contain TikTok configuration
    instructions_str = job.get("instructions")
    is_tiktok = False
    tiktok_config = {}
    if instructions_str and instructions_str.strip().startswith("{"):
        try:
            config = json.loads(instructions_str)
            if isinstance(config, dict) and config.get("target_platform") == "tiktok":
                is_tiktok = True
                tiktok_config = config
        except:
            pass

    if is_tiktok:
        publish_tiktok_flow(rendered_files, clip_items, tiktok_config, job_id)
        print(f"Render & TikTok publish job {job_id} completed.")
        return

    # Otherwise YouTube publish or just done
    youtube_links = []
    if YOUTUBE_AUTO_PUBLISH or (instructions_str and instructions_str.strip().startswith("{")):
        # Let's check if youtube token is in instructions
        custom_refresh_token = None
        if instructions_str and instructions_str.strip().startswith("{"):
            try:
                config = json.loads(instructions_str)
                if isinstance(config, dict):
                    custom_refresh_token = config.get("youtube_refresh_token")
            except:
                pass
        
        if YOUTUBE_AUTO_PUBLISH or custom_refresh_token:
            for i, rendered in enumerate(rendered_files):
                try:
                    upload_progress = f"Progress: Enviando clipe {i+1} de {len(rendered_files)} para o YouTube..."
                    print(upload_progress)
                    update_job(job_id, {"output_path": upload_progress})
                    
                    clip = clip_items[i]
                    youtube_url = upload_clip_to_youtube(rendered, clip, job)
                    clip["youtube_url"] = youtube_url  # Save the uploaded youtube url
                    youtube_links.append(youtube_url)
                    print(f"Published to YouTube: {youtube_url}")
                except Exception as upload_exc:
                    print("YouTube upload failed:", upload_exc)

    rendered_files_strs = [str(f) for f in rendered_files]
    original_paths = " | ".join(rendered_files_strs) if rendered_files_strs else str(OUTPUT_DIR)
    
    all_yt_links = [clip["youtube_url"] for clip in clip_items if clip.get("youtube_url")]
    output_paths = original_paths
    if all_yt_links:
        output_paths = f"{original_paths} | YouTube: {' | '.join(all_yt_links)}"
    
    update_job(job_id, {
        "status": "done",
        "output_path": output_paths,
        "completed_at": utc_now_iso(),
        "error_message": None,
        "clip_items": clip_items,
    })
    print(f"Render job {job_id} completed. Files: {len(rendered_files)}")


def process_publish_job(job: dict) -> None:
    """Process a publish request job (status: published_requested)."""
    job_id = job["id"]
    print(f"Processing publish request: {job_id}")

    instructions_str = job.get("instructions")
    is_tiktok = False
    tiktok_config = {}
    custom_refresh_token = None
    clip_index = None

    if instructions_str and instructions_str.strip().startswith("{"):
        try:
            config = json.loads(instructions_str)
            if isinstance(config, dict):
                clip_index = config.get("clip_index")
                if config.get("target_platform") == "tiktok":
                    is_tiktok = True
                    tiktok_config = config
                else:
                    custom_refresh_token = config.get("youtube_refresh_token")
        except Exception as e:
            print("Error parsing instructions JSON:", e)

    clip_items = job.get("clip_items") or []

    # Get the output files to publish (try clip_items local paths first, fallback to output_path)
    files_to_publish = []
    for clip in clip_items:
        local_path_str = clip.get("local_path")
        if local_path_str:
            files_to_publish.append(Path(local_path_str))
        else:
            files_to_publish.append(None)

    # Fallback to output_path parsing if no local_paths found
    if not any(files_to_publish):
        files_to_publish = []
        output_path = job.get("output_path", "")
        for part in output_path.split(" | "):
            part_str = part.strip()
            if not part_str.startswith("YouTube:") and not part_str.startswith("Progress:") and not part_str.startswith("TikTok:") and part_str:
                files_to_publish.append(Path(part_str))

    if is_tiktok:
        publish_tiktok_flow(files_to_publish, clip_items, tiktok_config, job_id, clip_index)
        return

    # Otherwise it's YouTube
    missing_config = get_missing_youtube_config(custom_refresh_token)
    if missing_config:
        missing_text = ", ".join(missing_config)
        raise RuntimeError(
            f"Publicacao no YouTube nao configurada neste worker. Ajuste: {missing_text}"
        )

    youtube_links = []
    original_paths = " | ".join(str(f) for f in files_to_publish if f)

    for i, file_path in enumerate(files_to_publish):
        if clip_index is not None and i != clip_index:
            continue

        if file_path and file_path.exists() and i < len(clip_items):
            try:
                upload_progress = f"Progress: Enviando clipe {i+1} de {len(files_to_publish)} para o YouTube..."
                print(upload_progress)
                update_job(job_id, {"output_path": f"{original_paths} | {upload_progress}"})
                
                clip = clip_items[i]
                youtube_url = upload_clip_to_youtube(file_path, clip, job)
                clip["youtube_url"] = youtube_url
                youtube_links.append(youtube_url)
                print(f"Published to YouTube: {youtube_url}")
            except Exception as upload_exc:
                print(f"YouTube upload failed for {file_path}: {upload_exc}")
                raise

    # Reconstruct output_path YouTube links from all clip_items that have a youtube_url
    all_yt_links = [clip["youtube_url"] for clip in clip_items if clip.get("youtube_url")]
    new_output = original_paths
    if all_yt_links:
        new_output = f"{original_paths} | YouTube: {' | '.join(all_yt_links)}"

    update_job(job_id, {
        "status": "completed",
        "output_path": new_output,
        "completed_at": utc_now_iso(),
        "error_message": None,
        "clip_items": clip_items,
    })
    print(f"Publish job {job_id} completed. YouTube links: {len(youtube_links)}")



def run_worker() -> None:
    print(f"Local render worker started. Polling every {POLL_SECONDS}s.")
    while True:
        try:
            job = fetch_pending_job()
            if not job:
                print("No pending jobs. Waiting...")
                time.sleep(POLL_SECONDS)
                continue

            job_id = job["id"]
            current_status = job["status"]
            print(f"Found {current_status} job: {job_id}")
            
            if not claim_job(job_id, current_status):
                print("Job already processed by another worker. Continuing...")
                continue

            if current_status == "pending":
                process_render_job(job)
            elif current_status == "published_requested":
                process_publish_job(job)
            else:
                print(f"Unknown job status: {current_status}")

        except Exception as exc:
            print("Worker error:", exc)
            if 'job_id' in locals():
                try:
                    update_job(job_id, {
                        "status": "failed",
                        "error_message": str(exc),
                        "completed_at": utc_now_iso(),
                    })
                except Exception as inner:
                    print("Could not mark job as failed:", inner)
            time.sleep(POLL_SECONDS)


def ensure_single_instance(port: int = 59888) -> None:
    """Ensure that only one instance of the worker is running on this machine."""
    import socket
    global _lock_socket
    try:
        _lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Bind to localhost to hold the lock without exposing external port
        _lock_socket.bind(("127.0.0.1", port))
    except socket.error:
        print(f"\n[ERRO] Outra instancia do worker.py ja esta rodando nesta maquina.")
        print("Use PARAR_TRABALHO.bat se quiser parar o worker ativo antes de iniciar outro.\n")
        sys.exit(0)


if __name__ == "__main__":
    ensure_single_instance()
    run_worker()

