-- (2026-10-17) BİLDİRME GENİŞLETME + ONAYSIZ GENEL ESER GİZLEME — Apple Guideline 1.2 (2026-10-16 güncellemesi)
--
-- NEDEN: 1.2 artık kullanıcının yüklediği / paylaştığı HER içeriği kapsıyor. Bildirme yalnız eser ve kullanıcı
-- içindi; repertuvar (genel/grup), ses kaydı ve ritim döngüsü (grupla paylaşılan) bildirilemiyordu.
-- Ayrıca works_read onay durumuna bakmıyordu: başkasının ONAY BEKLEYEN genel eseri API'den okunabiliyordu
-- (Kullanım Koşulları "herkese açık eserler yayınlanmadan önce incelenir" diyor). 2026-10-17 ölçüm: tüm eserler
-- 'approved' (group 1, private 686, public 100) → aşağıdaki kural bugün KİMSEYİ etkilemez.
--
-- 1) content_reports.target_type: + 'repertoire', 'audio' (work_audio), 'rhythm' (ritimler)
-- 2) Admin zil bildirimi yeni türleri adıyla yazar
-- 3) admin_icerik_gizle(tur, id): yönetici/editör bildirilen içeriği PAYLAŞIMDAN KALDIRIR (silmez; sahibi
--    görmeye devam eder): repertuvar → visibility 'private' + group_id null; kayıt/ritim → group_id null.
--    Bu tablolarda güncelleme yalnız sahibine açık olduğu için SECURITY DEFINER işlev.
-- 4) works_read: genel (ya da görünürlüğü boş) eser başkalarına YALNIZ onaylıysa görünür; sahibi, grup
--    üyeleri ve editör/admin için değişiklik yok.
--
-- ÇALIŞTIRMA: Supabase → SQL Editor → "1) KURULUM" → Run. Sonra "2) DOĞRULAMA" (salt okuma).

-- ============================================================ 1) KURULUM
begin;

alter table public.content_reports drop constraint if exists content_reports_target_type_check;
alter table public.content_reports add constraint content_reports_target_type_check
  check (target_type in ('work', 'user', 'repertoire', 'audio', 'rhythm'));

create or replace function public.notify_admins_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'content_report', 'Yeni içerik bildirimi',
         (case new.target_type when 'work' then 'Eser: ' when 'repertoire' then 'Repertuvar: '
                               when 'audio' then 'Ses kaydı: ' when 'rhythm' then 'Ritim: ' else 'Kullanıcı: ' end)
           || coalesce(new.target_label, new.target_id) || ' · '
           || case new.reason when 'offensive' then 'Uygunsuz içerik' when 'harassment' then 'Taciz / hakaret'
                              when 'copyright' then 'Telif ihlali' when 'spam' then 'Spam' else 'Diğer' end,
         jsonb_build_object('report_id', new.id, 'target_type', new.target_type, 'target_id', new.target_id)
  from profiles p
  where p.role = 'admin'
     or p.id in (select user_id from app_owners)
     or p.id = '4f965624-e524-4cb0-a351-3368f1297d28';
  return new;
end
$fn$;

create or replace function public.admin_icerik_gizle(p_tur text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare n int := 0;
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;
  if p_tur = 'repertoire' then
    update repertoires set visibility = 'private', group_id = null where id = p_id;
  elsif p_tur = 'audio' then
    update work_audio set group_id = null where id = p_id;
  elsif p_tur = 'rhythm' then
    update ritimler set group_id = null where id = p_id;
  else
    raise exception 'gecersiz-tur: %', p_tur using errcode = '22023';
  end if;
  get diagnostics n = row_count;
  return n > 0;
end
$fn$;
revoke all on function public.admin_icerik_gizle(text, uuid) from public, anon;
grant execute on function public.admin_icerik_gizle(text, uuid) to authenticated;

drop policy if exists works_read on public.works;
create policy works_read on public.works for select to public using (
  case when deleted_at is null then (
       ((visibility = 'public' or visibility is null) and coalesce(status, 'approved') = 'approved')
    or submitted_by = auth.uid()
    or (visibility = 'group' and public.work_grup_paylasimi(id))
    or public.is_editor_or_admin())
  else (submitted_by = auth.uid() or public.is_editor_or_admin())
  end
);

commit;

-- ============================================================ 2) DOĞRULAMA (salt okuma)
-- BEKLENEN: kısıt 5 türü içerir; işlev var; works_read koşulunda status geçer.
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'content_reports_target_type_check';
-- select proname from pg_proc where proname = 'admin_icerik_gizle';
-- select qual from pg_policies where tablename = 'works' and policyname = 'works_read';
-- Anon olarak görünen genel eser sayısı DEĞİŞMEMELİ (bugün 100):
-- select count(*) from public.works where deleted_at is null and visibility = 'public' and status = 'approved';

-- ============================================================ GERİ ALMA
-- begin;
-- alter table public.content_reports drop constraint content_reports_target_type_check;
-- alter table public.content_reports add constraint content_reports_target_type_check check (target_type in ('work','user'));
-- drop function if exists public.admin_icerik_gizle(text, uuid);
-- drop policy if exists works_read on public.works;
-- create policy works_read on public.works for select to public using (case when deleted_at is null then
--   ((visibility = 'public') or (visibility is null) or (submitted_by = auth.uid())
--    or ((visibility = 'group') and work_grup_paylasimi(id)) or is_editor_or_admin())
--   else ((submitted_by = auth.uid()) or is_editor_or_admin()) end);
-- (notify_admins_on_report önceki hâli: bildirme_engelleme.sql)
-- commit;
