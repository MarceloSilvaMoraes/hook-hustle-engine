export type RenderJobStatus = "pending" | "in_progress" | "published_requested" | "done" | "completed" | "failed";

export interface RenderJobClip {
  title: string;
  score: number;
  startTimestamp: string;
  endTimestamp: string;
  durationSeconds: number;
  hookQuote: string;
  triggers: string[];
  justification: string;
  captionStyle: string;
  brollSuggestion: string;
  transcriptExcerpt: string;
  thumbnailDataUrl?: string | null;
}

export interface RenderJobRow {
  id: string;
  created_at: string;
  updated_at: string;
  requested_by: string | null;
  video_url: string;
  video_title: string;
  platform: string;
  render_format: string;
  clip_items: RenderJobClip[];
  instructions: string | null;
  status: RenderJobStatus;
  worker_id: string | null;
  output_path: string | null;
  error_message: string | null;
  completed_at: string | null;
  locked_at: string | null;
}
