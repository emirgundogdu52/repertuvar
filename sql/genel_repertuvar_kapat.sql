-- "GENEL" REPERTUVARLARI GENELDEN ÇEKME (2026-10-10)
--
-- NEDEN: katalog_100_paket.sql'den sonra 3 genel repertuvarın eserleri çoğunlukla gizli kaldı (1/1, 4/8, 15/15):
-- yeni kullanıcı (ve Apple inceleyicisi) bunları Repertuvarlar'da boş/eksik görüyordu; ana sayfadaki "Repertuvar"
-- sayacı da yeni hesapta bunları sayıp 3-4 gösteriyordu.
-- YÖNTEM: visibility 'public' → grubu varsa 'group', yoksa 'private'; is_public false (uygulamanın saveRep modeliyle aynı).
-- Repertuvar SİLİNMEZ; sahibi ve grubu görmeye devam eder. Eski değerler repertuvar_gorunurluk_yedek'te.
-- GERİ ALMA: dosyanın sonu.

create table if not exists public.repertuvar_gorunurluk_yedek as
  select id as repertoire_id, visibility as eski_visibility, is_public as eski_is_public, now() as degisti_at
  from public.repertoires where false;
alter table public.repertuvar_gorunurluk_yedek enable row level security;   -- politika yok: yalnız SQL Editor / service_role
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'repertuvar_gorunurluk_yedek_pkey') then
    alter table public.repertuvar_gorunurluk_yedek add constraint repertuvar_gorunurluk_yedek_pkey primary key (repertoire_id);
  end if;
end $$;

-- Güvenlik: beklenen 3 genel repertuvar; farklıysa HİÇBİR ŞEY yapma.
do $$
declare n int;
begin
  select count(*) into n from public.repertoires where visibility = 'public';
  if n <> 3 then raise exception 'Beklenen 3 genel repertuvar, bulunan % — işlem iptal', n; end if;
end $$;

insert into public.repertuvar_gorunurluk_yedek (repertoire_id, eski_visibility, eski_is_public, degisti_at)
  select id, visibility, is_public, now() from public.repertoires where visibility = 'public'
on conflict (repertoire_id) do nothing;

update public.repertoires
  set visibility = case when group_id is not null then 'group' else 'private' end,
      is_public = false
  where visibility = 'public';

-- Kontrol: genel kalan 0, yedekte 3
select
  (select count(*) from public.repertoires where visibility = 'public') as genel_kalan,
  (select count(*) from public.repertuvar_gorunurluk_yedek) as yedekte;

-- ─────────────────────────────────────────────────────────────────────────────
-- GERİ ALMA:
--   update public.repertoires r set visibility = y.eski_visibility, is_public = y.eski_is_public
--     from public.repertuvar_gorunurluk_yedek y where r.id = y.repertoire_id;
--   delete from public.repertuvar_gorunurluk_yedek;
