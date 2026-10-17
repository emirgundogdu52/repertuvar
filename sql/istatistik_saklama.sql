-- ═══ Kullanım istatistiği: saklama süreleri + bölgesel toplu tablo (2026-10-17) ═══
-- Canlıda KULLANICI çalıştırır (Supabase SQL Editor). Tekrar çalıştırılabilir (idempotent).
--
-- Neden: gizlilik metni (§6) "uygulama içi kullanım kayıtlarındaki kullanıcı kimliği, oturum kimliği, şehir ve bölge 30 gün,
-- kayıtların tamamı 180 gün sonra silinir" diyor — ama bunu yapan bir görev YOKTU (2026-10-17 denetimi). Kullanıcı ayrıca
-- bölgesel tanıtım çalışmaları için şehir verisini uzun süre istiyor → kimliksiz, GÜNLÜK şehir özeti tutulur (kişisel veri değil,
-- süresiz saklanabilir); ham kayıtlar sözdeki sürelerde anonimleşir / silinir.
--
-- Geri alma (en altta): cron görevini kaldırır; özet tablosu ve fonksiyon kalır (zararsız).
--
-- Not: Yönetim › İstatistikler sayfası şehir dağılımını ham kayıtlardan çizer; bakımdan sonra ham kayıtlarda şehir yalnız son
-- 30 gün için bulunur. Daha eski şehir verisi page_views_sehir_ozet'tedir (sayfayı özete bağlamak ayrı iş).

-- 1) Zamanlayıcı eklentisi (Supabase'de Database › Extensions › pg_cron ile de açılabilir)
create extension if not exists pg_cron with schema pg_catalog;   -- Supabase belgesindeki şema; zaten açıksa atlanır

-- 2) Kimliksiz günlük şehir özeti — yalnız yöneticiler okur
create table if not exists public.page_views_sehir_ozet (
  gun         date not null,                -- UTC gün
  ulke        text not null default '',
  bolge       text not null default '',
  sehir       text not null default '',
  platform    text not null default '',     -- web / ios / android
  kullanici   integer not null default 0,   -- o gün o şehirde görülen farklı (giriş yapmış) kullanıcı sayısı
  ziyaret     integer not null default 0,   -- farklı oturum sayısı
  goruntuleme integer not null default 0,   -- sayfa görüntüleme sayısı
  primary key (gun, ulke, bolge, sehir, platform)
);
alter table public.page_views_sehir_ozet enable row level security;
drop policy if exists "sehir_ozet_select_admin" on public.page_views_sehir_ozet;
create policy "sehir_ozet_select_admin" on public.page_views_sehir_ozet for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 3) Bakım: önce özetle (kimlikler henüz yerindeyken), sonra anonimleştir, sonra sil
create or replace function public.istatistik_bakim() returns void
language plpgsql security definer set search_path = public as $$
begin
  -- a) Son 3 tam günü özetle (görev bir gün kaçarsa da eksik kalmasın); aynı gün yeniden hesaplanırsa üzerine yazılır
  insert into page_views_sehir_ozet (gun, ulke, bolge, sehir, platform, kullanici, ziyaret, goruntuleme)
  select (created_at at time zone 'UTC')::date, coalesce(country, ''), coalesce(region, ''), coalesce(city, ''),
         coalesce(platform, ''), count(distinct user_id), count(distinct session_id), count(*)
    from page_views
   where created_at >= (now() at time zone 'UTC')::date - 3
     and created_at <  (now() at time zone 'UTC')::date
   group by 1, 2, 3, 4, 5
  on conflict (gun, ulke, bolge, sehir, platform) do update
     set kullanici = excluded.kullanici, ziyaret = excluded.ziyaret, goruntuleme = excluded.goruntuleme;

  -- b) 30 günden eski kayıtlarda kimlik ve şehir/bölge silinir (ülke, sayfa, platform kalır)
  update page_views
     set user_id = null, session_id = 'anonim', city = null, region = null
   where created_at < now() - interval '30 days'
     and (user_id is not null or session_id <> 'anonim' or city is not null or region is not null);

  -- c) 180 günden eski kayıtlar tamamen silinir
  delete from page_views where created_at < now() - interval '180 days';
end $$;

-- 4) İLK ÇALIŞTIRMA: bugüne kadarki bütün günleri özetle (henüz hiç anonimleştirme yapılmadığı için kimlikler tam)
insert into public.page_views_sehir_ozet (gun, ulke, bolge, sehir, platform, kullanici, ziyaret, goruntuleme)
select (created_at at time zone 'UTC')::date, coalesce(country, ''), coalesce(region, ''), coalesce(city, ''),
       coalesce(platform, ''), count(distinct user_id), count(distinct session_id), count(*)
  from public.page_views
 where created_at < (now() at time zone 'UTC')::date
 group by 1, 2, 3, 4, 5
on conflict (gun, ulke, bolge, sehir, platform) do update
   set kullanici = excluded.kullanici, ziyaret = excluded.ziyaret, goruntuleme = excluded.goruntuleme;

-- 5) Her gün 03:15 UTC'de bakım (aynı adla varsa önce kaldırılır)
select cron.unschedule('istatistik_bakim') where exists (select 1 from cron.job where jobname = 'istatistik_bakim');
select cron.schedule('istatistik_bakim', '15 3 * * *', $$select public.istatistik_bakim()$$);

-- 6) İlk bakımı hemen çalıştır (30 günden eskileri anonimleştirir — özet 4. adımda alındı)
select public.istatistik_bakim();

-- Doğrulama (salt okuma):
--   select count(*) as ozet_satir, min(gun), max(gun), sum(goruntuleme) from public.page_views_sehir_ozet;
--   select count(*) filter (where user_id is not null and created_at < now() - interval '30 days') as anonimlesmemis
--     from public.page_views;   -- 0 olmalı
--   select jobname, schedule from cron.job where jobname = 'istatistik_bakim';

-- GERİ ALMA:
--   select cron.unschedule('istatistik_bakim');
