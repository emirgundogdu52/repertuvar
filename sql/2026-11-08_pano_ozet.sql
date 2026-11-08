-- 2026-11-08 UYGULANDI (apply_migration "pano_ozet_widget"; Emir: "A, çalıştır, sabah yazmasına da izin veriyorum").
-- Repertuvar Pano iOS widget'ı (Repertuvar/_pano-ios) için yalnız TOPLAM sayılar. Gizli anahtar yalnız uygulamada
-- (_pano-ios/Ortak/Gizli.swift, _pano-ios/.anahtar); burada yalnız SHA-256 özeti var. Anahtar değişirse özet de değişmeli.
-- pano_dis_veri: sabah yenilemesi (Claude) Meta/TikTok/YouTube/App Store/Play toplamlarını upsert eder. RLS açık, politika yok.
create table if not exists public.pano_dis_veri (
  anahtar text primary key, deger numeric, donem text, kaynak text, guncellendi timestamptz not null default now());
alter table public.pano_dis_veri enable row level security;
-- pano_ozet(p_anahtar) security definer: anahtar özeti tutmazsa 42501 (HTTP 401). Döndürdüğü: zaman, toplam_hesap, son7_hesap,
-- onceki7_hesap, aktif_deneme, ucretli, site_28g, site_7g, site_sosyal_28g, dis{anahtar:{deger,donem,guncellendi}}.
-- Tam tanım: select pg_get_functiondef('public.pano_ozet(text)'::regprocedure);
-- grant execute ... to anon, authenticated; revoke ... from public.
-- 2026-11-08 18.2x UYGULANDI (apply_migration "pano_ozet_site_suzgec", Emir "Çalıştır"): site_28g/site_7g/site_sosyal_28g artık
-- landing_stats gibi public.istatistik_sayilmaz(ref) olanları saymıyor (28 günde 355 → 352).
