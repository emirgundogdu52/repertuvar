-- İÇERİK BİLDİRME VE KULLANICI ENGELLEME (2026-10-09)
--
-- NEDEN: Apple App Review, Guideline 1.2 (kullanıcı içeriği): başkalarının gördüğü kullanıcı içeriği olan
-- uygulamada (1) uygunsuz içeriği bildirme + ekibin kısa sürede yanıtı, (2) rahatsız eden kullanıcıyı
-- engelleme olmalı. Bizde genel eserler zaten ekip onayından geçiyor (eser_onay_korumasi.sql); bildirme ve
-- engelleme yoktu.
--
-- content_reports : kullanıcı bir eseri ya da kullanıcıyı bildirir. Kendi bildirimini görür (bildirdiği eser
--                   ona gizlenir); admin/editör hepsini görür ve kapatır. Yeni bildirim adminlere zil
--                   bildirimi olarak düşer (notifications'a yalnız bu SECURITY DEFINER tetikleyici yazar).
-- user_blocks     : kullanıcı başka bir kullanıcıyı engeller; engellenenin eserleri ve paylaştığı
--                   repertuvarlar engelleyene gösterilmez (istemcide süzülür). Yalnız kendi satırları.
--
-- Hesap silme bozulmaz: auth.users'a FK'ler ON DELETE SET NULL / CASCADE (delete_my_account auth.users'ı siler).

create table if not exists public.content_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid default auth.uid() references auth.users(id) on delete set null,
  target_type    text not null check (target_type in ('work', 'user')),
  target_id      text not null check (char_length(target_id) <= 64),
  target_user_id uuid references auth.users(id) on delete set null,
  target_label   text check (char_length(target_label) <= 200),
  reason         text not null check (reason in ('offensive', 'harassment', 'copyright', 'spam', 'other')),
  note           text check (char_length(note) <= 1000),
  status         text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note     text check (char_length(admin_note) <= 1000),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references auth.users(id) on delete set null
);
create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);
-- Aynı kişi aynı içeriği açıkken iki kez bildiremesin (istemci 409'u "zaten bildirildi" sayar)
create unique index if not exists content_reports_tek_acik
  on public.content_reports (reporter_id, target_type, target_id) where status = 'open';

alter table public.content_reports enable row level security;
drop policy if exists cr_insert on public.content_reports;
create policy cr_insert on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and resolved_at is null and resolved_by is null
              and admin_note is null);
drop policy if exists cr_select on public.content_reports;
create policy cr_select on public.content_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_app_admin() or public.is_editor_or_admin());
drop policy if exists cr_update on public.content_reports;
create policy cr_update on public.content_reports for update to authenticated
  using (public.is_app_admin() or public.is_editor_or_admin())
  with check (public.is_app_admin() or public.is_editor_or_admin());
drop policy if exists cr_delete on public.content_reports;
create policy cr_delete on public.content_reports for delete to authenticated
  using (public.is_app_admin());

create table if not exists public.user_blocks (
  blocker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists ub_select on public.user_blocks;
create policy ub_select on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid() or public.is_app_admin());
drop policy if exists ub_insert on public.user_blocks;
create policy ub_insert on public.user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());
drop policy if exists ub_delete on public.user_blocks;
create policy ub_delete on public.user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- Yeni bildirim → adminlere zil bildirimi (notifications'ta insert politikası yok; yalnız bu fonksiyon yazar)
create or replace function public.notify_admins_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'content_report', 'Yeni içerik bildirimi',
         (case new.target_type when 'work' then 'Eser: ' else 'Kullanıcı: ' end)
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
drop trigger if exists trg_notify_admins_on_report on public.content_reports;
create trigger trg_notify_admins_on_report
  after insert on public.content_reports
  for each row execute function public.notify_admins_on_report();

-- GERİ ALMA (gerekirse):
--   drop table if exists public.content_reports; drop table if exists public.user_blocks;
--   drop function if exists public.notify_admins_on_report();
