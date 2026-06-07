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


def get_missing_youtube_config() -> list[str]:
    missing: list[str] = []
    if not YOUTUBE_AUTO_PUBLISH:
        missing.append("YOUTUBE_AUTO_PUBLISH=true")
    if not YOUTUBE_CLIENT_ID:
        missing.append("YOUTUBE_CLIENT_ID")
    if not YOUTUBE_CLIENT_SECRET:
        missing.append("YOUTUBE_CLIENT_SECRET")
    if not YOUTUBE_REFRESH_TOKEN:
        missing.append("YOUTUBE_REFRESH_TOKEN")
    return missing


def get_youtube_service():
    if not YOUTUBE_AUTO_PUBLISH:
        return None
    if not all([YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN]):
        return None

    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    credentials = Credentials(
        token=None,
        refresh_token=YOUTUBE_REFRESH_TOKEN,
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("youtube", "v3", credentials=credentials)


def upload_clip_to_youtube(file_path: Path, clip: dict) -> str:
    service = get_youtube_service()
    if service is None:
        raise RuntimeError("YouTube auto-publish não está configurado. Defina YOUTUBE_AUTO_PUBLISH e as credenciais do Google.")

    from googleapiclient.http import MediaFileUpload

    title = (clip.get("title") or "Clip gerado pelo Hook Hustle Engine").strip()[:100]
    description = (clip.get("hookQuote") or clip.get("justification") or "Clip gerado automaticamente.").strip()[:5000]
    tags = [tag.strip() for tag in (clip.get("triggers") or []) if tag and tag.strip()][:50]

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": YOUTUBE_PRIVACY_STATUS,
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


def build_ffmpeg_filters() -> str:
    return (
        "scale='if(gt(a,9/16),1080,-2)':'if(gt(a,9/16),-2,1920)',"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
    )


def render_clip(source_path: Path, clip: dict, output_dir: Path) -> Path:
    start = parse_timestamp(clip["startTimestamp"])
    end = parse_timestamp(clip["endTimestamp"])
    title = sanitize_filename(clip.get("title", "clip"))
    output_file = output_dir / f"{title}_{start.replace(':', '-')}_{end.replace(':', '-')}.mp4"

    run_command([
        "ffmpeg",
        "-y",
        "-ss",
        start,
        "-to",
        end,
        "-i",
        str(source_path),
        "-vf",
        build_ffmpeg_filters(),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        str(output_file),
    ])
    return output_file


def process_render_job(job: dict) -> None:
    """Process a rendering job (status: pending)."""
    job_id = job["id"]
    print(f"Processing render job: {job_id}")
    
    workspace = OUTPUT_DIR / job_id
    workspace.mkdir(parents=True, exist_ok=True)
    video_file = download_video(job["video_url"], workspace)

    rendered_files = []
    youtube_links = []
    clip_items = job.get("clip_items") or []
    for clip in clip_items:
        rendered = render_clip(video_file, clip, OUTPUT_DIR)
        rendered_files.append(str(rendered))

        if YOUTUBE_AUTO_PUBLISH:
            try:
                youtube_url = upload_clip_to_youtube(rendered, clip)
                youtube_links.append(youtube_url)
                print(f"Published to YouTube: {youtube_url}")
            except Exception as upload_exc:
                print("YouTube upload failed:", upload_exc)

    output_paths = " | ".join(rendered_files) if rendered_files else str(OUTPUT_DIR)
    if youtube_links:
        output_paths = f"{output_paths} | YouTube: {' | '.join(youtube_links)}"
    update_job(job_id, {
        "status": "done",
        "output_path": output_paths,
        "completed_at": utc_now_iso(),
        "error_message": None,
    })
    print(f"Render job {job_id} completed. Files: {len(rendered_files)}")


def process_publish_job(job: dict) -> None:
    """Process a publish request job (status: published_requested)."""
    job_id = job["id"]
    print(f"Processing publish request: {job_id}")

    missing_config = get_missing_youtube_config()
    if missing_config:
        missing_text = ", ".join(missing_config)
        raise RuntimeError(
            f"Publicação no YouTube não configurada neste worker. Ajuste: {missing_text}"
        )

    # Get the output files to publish
    output_path = job.get("output_path", "")
    if not output_path:
        raise RuntimeError("Job has no output path to publish")

    # Extract local file paths (before YouTube links)
    files_to_publish = []
    for part in output_path.split(" | "):
        if not part.strip().startswith("YouTube:") and part.strip():
            files_to_publish.append(Path(part.strip()))

    youtube_links = []
    clip_items = job.get("clip_items") or []
    
    for i, file_path in enumerate(files_to_publish):
        if file_path.exists() and i < len(clip_items):
            try:
                clip = clip_items[i]
                youtube_url = upload_clip_to_youtube(file_path, clip)
                youtube_links.append(youtube_url)
                print(f"Published to YouTube: {youtube_url}")
            except Exception as upload_exc:
                print(f"YouTube upload failed for {file_path}: {upload_exc}")
                raise

    new_output = output_path
    if youtube_links:
        new_output = f"{output_path} | YouTube: {' | '.join(youtube_links)}"
    
    update_job(job_id, {
        "status": "completed",
        "output_path": new_output,
        "completed_at": utc_now_iso(),
        "error_message": None,
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


if __name__ == "__main__":
    run_worker()
