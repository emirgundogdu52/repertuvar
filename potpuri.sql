-- ════════════════════════════════════════════════════════════════════
-- POTPURİ (medley) — 2026-07-19
-- Supabase → SQL Editor'da bir kez çalıştır.
--
-- Model: linked_prev = "bu eser bir öncekiyle KESİNTİSİZ devam eder".
-- Potpuri = linked_prev=true olan ARDIŞIK satırların zinciri.
-- Ayrı grup tablosu/id yok — sürükle-bırak sıralaması bozulmasın diye.
-- ════════════════════════════════════════════════════════════════════

alter table public.repertoire_items
  add column if not exists linked_prev boolean not null default false;

-- Mevcut RLS politikaları satır bazlı olduğu için ek politika gerekmiyor.
-- Kontrol:
-- select id, repertoire_id, seq, work_id, linked_prev
--   from public.repertoire_items order by repertoire_id, seq limit 20;
