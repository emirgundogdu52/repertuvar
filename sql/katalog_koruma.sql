-- KATALOG KORUMA — TOPLU OKUMAYA KARŞI ANINDA KORUMA + İZLEME + ENGEL (2026-10-25)
--
-- Kullanıcı: "2 yap" — oturumlu bir hesabın kataloğu betikle toplu çekmesine karşı izleme ve sınır
-- (icerik_koruma.sql girişsiz okumayı kapattı; bu dosya GİRİŞ YAPMIŞ hesap içindir).
--
-- ÖLÇÜM (2026-10-25, edge_logs + auth.sessions):
--   · Uygulama katalogu çevrimdışı sahne için TEK istekte indiriyor → istek sayısı betiği ayırt etmez (normal üye 7–53
--     works isteği/gün; tek istek = tüm katalog). Sahip hesabı test yüzünden ~2.800/gün.
--   · Ayırt eden istemci: auth.sessions'taki 211 oturumun (38 kişi) HEPSİ 'Mozilla/…' (WebView / tarayıcı); son 24 saatte
--     41.502 REST isteğinin hepsi 'Mozilla/…'. Uygulama works'te offset / Range KULLANMIYOR.
--
-- KATMANLAR
--  1) ANINDA (okuma kuralı): works üzerinde RESTRICTIVE SELECT politikası. Kullanıcının kendi eklemediği satırlar (katalog,
--     grup) yalnız oturumu tarayıcı/uygulamadan açılmış (auth.sessions.user_agent 'Mozilla/%' ya da boş) VE katalog engeli
--     olmayan kullanıcıya görünür. Betikle (python, curl, node…) giriş yapıp jeton alan kişi katalogu İLK istekte bile göremez.
--     Oturum satırı bulunamazsa AÇIK (fail-open): iptal edilmiş oturumun jetonu ≤1 saat geçerli, meşru kullanıcı sahnede kalmasın.
--     Yönetici / editör muaf. Mevcut kural (works_read) aynen durur; RESTRICTIVE politika onunla VE'lenir.
--     SINIR: user-agent taklit edilebilir; tarayıcıdan alınmış jetonla gelen betiği bu katman görmez → 3. katman.
--  2) İZLEME: pg_cron saatlik `katalog_okuma_denetle(2)`: son 2 saatte açılmış tarayıcı dışı oturum → `katalog_okuma_isaret`
--     (kişi + gün başına bir kez) + yöneticilere zil bildirimi (ayarlar.html#katalogKoruma). OTOMATİK ENGEL YOK — karar yöneticide.
--  3) KAYIT SORGUSU (elle; ileride zamanlanabilir): en altta — works isteği yapan tarayıcı dışı UA, TLS parmak izi (JA4) çeşitliliği,
--     offset / Range, günlük hacim.
--  ENGEL: `katalog_engel` (süreli / süresiz). Engelli kullanıcı katalogu boş görür; kendi eserleri durur. Yönetici RPC'leri:
--     katalog_koruma_durum() · katalog_engelle(kullanici, gun, sebep) · katalog_engel_kaldir(kullanici) · katalog_isaret_kapat(id).
--     Arayüz: ayarlar.html › Yönetim › Katalog Koruma.
--
-- Etkisi: bugün KİMSE etkilenmez (tüm oturumlar Mozilla, engel yok). Mağazadaki sürümler WebView → etkilenmez.
-- ÇALIŞTIRMA: tamamı → DOĞRULAMA (en alt, salt okuma). Geri alma en altta.

-- ============================================================ TABLOLAR
create table if not exists public.katalog_okuma_isaret (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  sebep      text not null,
  ayrinti    jsonb,
  gun        date not null default current_date,
  durum      text not null default 'acik' check (durum in ('acik', 'kapatildi', 'engellendi')),
  created_at timestamptz not null default now(),
  unique (user_id, sebep, gun)
);
alter table public.katalog_okuma_isaret enable row level security;
drop policy if exists katalog_okuma_isaret_yonetici on public.katalog_okuma_isaret;
create policy katalog_okuma_isaret_yonetici on public.katalog_okuma_isaret for select to authenticated
  using (public.is_app_admin() or public.is_editor_or_admin());
revoke all on table public.katalog_okuma_isaret from anon;

create table if not exists public.katalog_engel (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  sebep      text check (char_length(sebep) <= 300),
  bitis      timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.katalog_engel enable row level security;
drop policy if exists katalog_engel_yonetici on public.katalog_engel;
create policy katalog_engel_yonetici on public.katalog_engel for select to authenticated
  using (public.is_app_admin() or public.is_editor_or_admin());
revoke all on table public.katalog_engel from anon;

-- ============================================================ 1) ANINDA KORUMA
-- Bu oturum katalogu görebilir mi? Engel yok VE (oturum tarayıcı/uygulamadan açılmış ya da oturum bulunamadı).
create or replace function public.katalog_istemci_uygun()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select not exists (select 1 from public.katalog_engel e
                     where e.user_id = auth.uid() and (e.bitis is null or e.bitis > now()))
     and coalesce((select s.user_agent is null or s.user_agent like 'Mozilla/%'
                    from auth.sessions s
                    where s.id = case when coalesce(auth.jwt() ->> 'session_id', '') ~ '^[0-9a-fA-F-]{36}$'
                                      then (auth.jwt() ->> 'session_id')::uuid end), true)
$fn$;
revoke execute on function public.katalog_istemci_uygun() from public, anon;
grant execute on function public.katalog_istemci_uygun() to authenticated;

drop policy if exists works_katalog_koruma on public.works;
create policy works_katalog_koruma on public.works as restrictive for select to authenticated
  using (submitted_by = auth.uid()
         or (select public.is_editor_or_admin())
         or (select public.is_app_admin())
         or (select public.katalog_istemci_uygun()));

-- ============================================================ 2) İZLEME (saatlik)
create or replace function public.katalog_okuma_denetle(p_saat int default 2)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n int := 0;
  r record;
begin
  for r in
    select s.user_id, min(s.created_at) as ilk, count(*) as oturum,
           string_agg(distinct left(s.user_agent, 120), ' | ') as ua
    from auth.sessions s
    where s.created_at > now() - make_interval(hours => p_saat)
      and s.user_agent is not null and s.user_agent not like 'Mozilla/%'
    group by s.user_id
  loop
    insert into public.katalog_okuma_isaret (user_id, sebep, ayrinti)
    values (r.user_id, 'tarayici_disi_oturum', jsonb_build_object('ua', r.ua, 'oturum', r.oturum, 'ilk', r.ilk))
    on conflict (user_id, sebep, gun) do nothing;
    if found then
      n := n + 1;
      insert into public.notifications (user_id, type, title, body, data)
      select p.id, 'katalog_koruma', 'Katalog koruma: tarayıcı dışı giriş',
             coalesce((select u.email from auth.users u where u.id = r.user_id), r.user_id::text) || ' · ' || left(r.ua, 80),
             jsonb_build_object('url', 'ayarlar.html#katalogKoruma', 'user_id', r.user_id)
      from public.profiles p
      where p.role = 'admin' or p.id in (select user_id from public.app_owners);
    end if;
  end loop;
  return n;
end
$fn$;
revoke execute on function public.katalog_okuma_denetle(int) from public, anon, authenticated;

select cron.unschedule('katalog_okuma_denetle') where exists (select 1 from cron.job where jobname = 'katalog_okuma_denetle');
select cron.schedule('katalog_okuma_denetle', '7 * * * *', $$select public.katalog_okuma_denetle(2)$$);

-- ============================================================ YÖNETİCİ RPC'leri
create or replace function public.katalog_koruma_durum()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'isaretler', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'user_id', i.user_id, 'eposta', u.email, 'sebep', i.sebep,
                   'ayrinti', i.ayrinti, 'gun', i.gun, 'durum', i.durum, 'tarih', i.created_at) order by i.created_at desc)
                   from (select * from public.katalog_okuma_isaret order by created_at desc limit 100) i
                   left join auth.users u on u.id = i.user_id), '[]'::jsonb),
    'engeller', coalesce((select jsonb_agg(jsonb_build_object('user_id', e.user_id, 'eposta', u.email, 'sebep', e.sebep,
                   'bitis', e.bitis, 'tarih', e.created_at) order by e.created_at desc)
                   from public.katalog_engel e left join auth.users u on u.id = e.user_id
                   where e.bitis is null or e.bitis > now()), '[]'::jsonb));
end
$fn$;

create or replace function public.katalog_engelle(p_kullanici uuid, p_gun int default 7, p_sebep text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  if p_kullanici is null or p_kullanici = auth.uid() then
    raise exception 'geçersiz kullanıcı' using errcode = '22023';
  end if;
  insert into public.katalog_engel (user_id, sebep, bitis, created_by)
  values (p_kullanici, left(p_sebep, 300),
          case when p_gun is null or p_gun <= 0 then null else now() + make_interval(days => p_gun) end, auth.uid())
  on conflict (user_id) do update
    set sebep = excluded.sebep, bitis = excluded.bitis, created_by = excluded.created_by, created_at = now();
  update public.katalog_okuma_isaret set durum = 'engellendi' where user_id = p_kullanici and durum = 'acik';
end
$fn$;

create or replace function public.katalog_engel_kaldir(p_kullanici uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  delete from public.katalog_engel where user_id = p_kullanici;
end
$fn$;

create or replace function public.katalog_isaret_kapat(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  update public.katalog_okuma_isaret set durum = 'kapatildi' where id = p_id and durum = 'acik';
end
$fn$;

revoke execute on function public.katalog_koruma_durum() from public, anon;
revoke execute on function public.katalog_engelle(uuid, int, text) from public, anon;
revoke execute on function public.katalog_engel_kaldir(uuid) from public, anon;
revoke execute on function public.katalog_isaret_kapat(bigint) from public, anon;
grant execute on function public.katalog_koruma_durum() to authenticated;
grant execute on function public.katalog_engelle(uuid, int, text) to authenticated;
grant execute on function public.katalog_engel_kaldir(uuid) to authenticated;
grant execute on function public.katalog_isaret_kapat(bigint) to authenticated;

-- ============================================================ DOĞRULAMA (salt okuma)
-- select count(*) filter (where user_agent is not null and user_agent not like 'Mozilla/%') as tarayici_disi_oturum from auth.sessions;  -- 0
-- select polname, polpermissive from pg_policy where polrelid = 'public.works'::regclass;   -- works_katalog_koruma f (restrictive)
-- select jobname, schedule from cron.job where jobname = 'katalog_okuma_denetle';

-- ============================================================ 3) KAYIT SORGUSU (Supabase › Logs › edge_logs, ClickHouse; 24 saat)
-- select log_attributes['request.sb.jwt.authorization.payload.subject'] as kisi,
--        count() as works_istek,
--        countIf(not startsWith(log_attributes['request.headers.user_agent'], 'Mozilla/')) as tarayici_disi,
--        countIf(position(log_attributes['request.search'], 'offset=') > 0 or log_attributes['request.headers.range'] != '') as sayfali,
--        uniqExact(log_attributes['request.cf.botManagement.ja4']) as ja4_cesit,
--        any(log_attributes['request.headers.user_agent']) as ua
-- from logs where source = 'edge_logs' and log_attributes['request.path'] = '/rest/v1/works'
-- group by kisi having tarayici_disi > 0 or sayfali > 0 or works_istek > 500 order by works_istek desc;

-- ============================================================ GERİ AL
-- drop policy if exists works_katalog_koruma on public.works;
-- select cron.unschedule('katalog_okuma_denetle');
-- drop function if exists public.katalog_okuma_denetle(int), public.katalog_koruma_durum(), public.katalog_engelle(uuid, int, text),
--   public.katalog_engel_kaldir(uuid), public.katalog_isaret_kapat(bigint), public.katalog_istemci_uygun();
-- drop table if exists public.katalog_okuma_isaret, public.katalog_engel;
