-- Create render_jobs table migration
create extension if not exists pgcrypto;

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  requested_by text,
  video_url text not null,
  video_title text,
  platform text not null,
  render_format text not null default '9:16',
  clip_items jsonb not null default '[]',
  instructions text,
  status text not null default 'pending',
  worker_id text,
  output_path text,
  error_message text,
  completed_at timestamptz,
  locked_at timestamptz
);

create index if not exists render_jobs_status_idx on public.render_jobs(status);
create index if not exists render_jobs_created_at_idx on public.render_jobs(created_at desc);
