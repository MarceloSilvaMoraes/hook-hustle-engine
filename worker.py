"""Local worker for render_jobs stored in Supabase."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime
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


def fetch_pending_job() -> dict | None:
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?select=*&status=eq.pending&order=created_at.asc&limit=1"
    response = request("GET", url, headers=HEADERS)
    response.raise_for_status()
    data = response.json()
    return data[0] if data else None


def claim_job(job_id: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?id=eq.{job_id}&status=eq.pending"
    body = {
        "status": "in_progress",
        "worker_id": WORKER_ID,
        "locked_at": datetime.utcnow().isoformat() + "Z",
    }
    response = request("PATCH", url, headers=HEADERS, data=json.dumps(body))
    response.raise_for_status()
    return response.json() != []


def update_job(job_id: str, updates: dict) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{JOB_TABLE}?id=eq.{job_id}"
    response = request("PATCH", url, headers=HEADERS, data=json.dumps(updates))
    response.raise_for_status()


def sanitize_filename(text: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "-_ ." else "_" for ch in text)
    return safe.strip().replace(" ", "_")[:120] or "clip"


def parse_timestamp(ts: str) -> str:
    parts = [int(p) for p in ts.split(":") if p.isdigit()]
    if len(parts) == 3:
        return f"{parts[0]:02d}:{parts[1]:02d}:{parts[2]:02d}"
    if len(parts) == 2:
        return f"{parts[0]:02d}:{parts[1]:02d}:00"
    return f"00:{parts[0]:02d}:00"


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
        "crop=1080:1920"
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


def run_worker() -> None:
    print(f"Local render worker started. Polling every {POLL_SECONDS}s.")
    while True:
        try:
            job = fetch_pending_job()
            if not job:
                print("Nenhum job pendente. Aguardando...")
                time.sleep(POLL_SECONDS)
                continue

            job_id = job["id"]
            print(f"Encontrado job pendente: {job_id}")
            if not claim_job(job_id):
                print("Job já foi processado por outro worker. Continuando...")
                continue

            workspace = OUTPUT_DIR / job_id
            workspace.mkdir(parents=True, exist_ok=True)
            video_file = download_video(job["video_url"], workspace)

            rendered_files = []
            clip_items = job.get("clip_items") or []
            for index, clip in enumerate(clip_items, start=1):
                rendered = render_clip(workspace, clip, OUTPUT_DIR)
                rendered_files.append(str(rendered))

            update_job(job_id, {
                "status": "done",
                "output_path": str(OUTPUT_DIR),
                "completed_at": datetime.utcnow().isoformat() + "Z",
                "error_message": None,
            })
            print(f"Job {job_id} concluído. Arquivos: {len(rendered_files)}")

        except Exception as exc:
            print("Erro no worker:", exc)
            if 'job_id' in locals():
                try:
                    update_job(job_id, {
                        "status": "failed",
                        "error_message": str(exc),
                        "completed_at": datetime.utcnow().isoformat() + "Z",
                    })
                except Exception as inner:
                    print("Não foi possível marcar job como failed:", inner)
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    run_worker()
