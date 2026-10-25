-- İSTATİSTİK SPAM TEMİZLİĞİ (2026-10-25)
--
-- Kullanıcı: "App yönetim sayfasında 'Nereden geldiler' altında aimanhunt.online adında bir site gördüm, nedir?" → referrer spam
-- (reklam amaçlı sahte ziyaret: http:// ile, tek sayfa, gece, 2 kez — 2026-10-06; aynı türden aicrawler.store 2026-10-10).
-- Zarar yok (o günlerde şüpheli hesap yok), yalnız sayaç kirli. → "evet, temizle sen yap".
--
--  · istatistik_spam_kaynak: kara liste (alt alan adları dahil). log_hit bu kaynaklardan gelen ziyareti HİÇ YAZMAZ.
--  · istatistik_sayilmaz(ref): sayımdan çıkan kaynak — kara liste, güvensiz http:// dış kaynak (bugün gerçek yönlendirme https),
--    geliştirme adresleri (localhost:PORT, 127.0.0.1). Uygulamanın kendi 'https://localhost' (Capacitor Android) ve
--    'android-app:' KORUNUR. Satırlar SİLİNMEZ, landing_stats yalnız saymaz (geri alması kolay).
--  · landing_stats: çıktı biçimi aynı (ok, bugun, gun7, gun30, toplam, kaynaklar ilk 6), yalnız temiz satırlarla.
--  · prune_page_views (gece 04:00 cron) girişsiz herkese açıktı → yalnız cron (icerik_koruma.sql'deki purge ile aynı gerekçe).
-- Yeni spam adı görülürse: insert into public.istatistik_spam_kaynak (alan, aciklama) values ('ornek.site', '...');

create table if not exists public.istatistik_spam_kaynak (
  alan     text primary key check (alan = lower(alan) and char_length(alan) between 3 and 120),
  aciklama text,
  eklendi  timestamptz not null default now()
);
alter table public.istatistik_spam_kaynak enable row level security;
revoke all on table public.istatistik_spam_kaynak from anon, authenticated;
insert into public.istatistik_spam_kaynak (alan, aciklama) values
  ('aimanhunt.online', 'referrer spam, 2026-10-06 (2 ziyaret, http)'),
  ('aicrawler.store', 'referrer spam, 2026-10-10 (1 ziyaret, http)')
on conflict (alan) do nothing;

-- 'https://www.ornek.com:8080/yol' → 'www.ornek.com:8080'
create or replace function public.istatistik_kaynak_alani(p_ref text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select lower(split_part(regexp_replace(coalesce(p_ref, ''), '^[a-z][a-z0-9+.-]*://', '', 'i'), '/', 1))
$fn$;

create or replace function public.istatistik_kara_listede(p_ref text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from public.istatistik_spam_kaynak s
                 where split_part(public.istatistik_kaynak_alani(p_ref), ':', 1) = s.alan
                    or split_part(public.istatistik_kaynak_alani(p_ref), ':', 1) like '%.' || s.alan)
$fn$;

create or replace function public.istatistik_sayilmaz(p_ref text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(p_ref, '') <> '' and (
    public.istatistik_kara_listede(p_ref)
    or (p_ref ilike 'http://%' and split_part(public.istatistik_kaynak_alani(p_ref), ':', 1) not in ('localhost', '127.0.0.1'))
    or public.istatistik_kaynak_alani(p_ref) ~ '^(localhost:[0-9]+|127\.0\.0\.1(:[0-9]+)?)$')
$fn$;
revoke execute on function public.istatistik_kara_listede(text) from public, anon, authenticated;
revoke execute on function public.istatistik_sayilmaz(text) from public, anon, authenticated;

-- Yazarken: kara listedeki kaynaktan gelen ziyaret yazılmaz (sessizce; çağıran hata görmez)
create or replace function public.log_hit(p_path text, p_ref text, p_cihaz text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.istatistik_kara_listede(p_ref) then return; end if;
  insert into public.landing_hits(path, ref, cihaz)
  values (left(coalesce(p_path, '/'), 200), left(nullif(p_ref, ''), 300), left(coalesce(p_cihaz, ''), 20));
end
$fn$;

-- Sayarken: spam / test kaynakları dışarıda
create or replace function public.landing_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare v jsonb;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  with temiz as (select ts, ref from public.landing_hits where not public.istatistik_sayilmaz(ref))
  select jsonb_build_object(
    'ok', true,
    'bugun', (select count(*) from temiz where ts >= date_trunc('day', now())),
    'gun7', (select count(*) from temiz where ts >= now() - interval '7 days'),
    'gun30', (select count(*) from temiz where ts >= now() - interval '30 days'),
    'toplam', (select count(*) from temiz),
    'kaynaklar', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select coalesce(nullif(split_part(replace(replace(ref, 'https://', ''), 'http://', ''), '/', 1), ''), 'doğrudan') as kaynak, count(*) as n
        from temiz where ts >= now() - interval '30 days' group by 1 order by 2 desc limit 6) x)
  ) into v;
  return v;
end
$fn$;

revoke execute on function public.prune_page_views() from public, anon, authenticated;

-- DOĞRULAMA (salt okuma):
-- select public.istatistik_sayilmaz('http://aimanhunt.online/'), public.istatistik_sayilmaz('https://www.google.com/'),
--        public.istatistik_sayilmaz('http://localhost:4420/'), public.istatistik_sayilmaz('https://localhost/'),
--        public.istatistik_sayilmaz('android-app://com.google.android.gm/');   -- t, f, t, f, f
-- GERİ AL: eski log_hit (language sql, tek insert) ve landing_stats (landing_hits doğrudan) — app/sql/istatistik_spam.sql geçmişi;
--   grant execute on function public.prune_page_views() to anon, authenticated; drop table public.istatistik_spam_kaynak; …
