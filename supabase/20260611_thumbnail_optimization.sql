-- ============================================================================
-- Thumbnail Optimization Tables
-- ============================================================================

-- Tabela 1: Cache de Thumbnails
CREATE TABLE IF NOT EXISTS thumbnail_cache (
  id TEXT PRIMARY KEY,
  video_hash TEXT NOT NULL,
  clip_title TEXT NOT NULL,
  clip_hook TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  person_position TEXT NOT NULL,
  thumbnail_data_url TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  
  -- Índices para busca rápida
  INDEX idx_video_hash (video_hash),
  INDEX idx_expires_at (expires_at)
);

-- Tabela 2: Webhooks de Thumbnails
CREATE TABLE IF NOT EXISTS thumbnail_webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  event TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT,
  last_fired_at BIGINT,
  failure_count INTEGER DEFAULT 0,
  
  -- Índices
  INDEX idx_event (event),
  INDEX idx_active (active)
);

-- Tabela 3: Logs de Processamento (opcional - para monitoramento)
CREATE TABLE IF NOT EXISTS thumbnail_processing_logs (
  id TEXT PRIMARY KEY,
  clip_title TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'cached'
  processing_time_ms INTEGER,
  error_message TEXT,
  cache_hit BOOLEAN DEFAULT FALSE,
  supabase_uploaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para análise
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_cache_hit (cache_hit)
);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE thumbnail_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnail_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnail_processing_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (todos podem ler e escrever - ajuste conforme necessário)
-- Em produção, adicione autenticação mais restrita

CREATE POLICY "thumbnail_cache_all_access"
  ON thumbnail_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "thumbnail_webhooks_all_access"
  ON thumbnail_webhooks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "thumbnail_processing_logs_all_access"
  ON thumbnail_processing_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Bucket do Storage para Vídeos
-- ============================================================================

-- Crie um bucket chamado "videos" via UI do Supabase ou execute:
-- INSERT INTO storage.buckets (id, name) VALUES ('videos', 'videos');

-- Política para permitir upload público (CUIDADO: Ajuste em produção)
-- INSERT INTO storage.policies (bucket_id, name, definition)
-- VALUES ('videos', 'Allow public upload', '{"role":"authenticated","operation":"INSERT"}');
