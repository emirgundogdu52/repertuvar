-- 2026-10-08 — Favoriler hesaba bağlı.
-- Supabase → SQL Editor'de BİR KEZ çalıştırılır (tekrar çalıştırmak zararsız).
--
-- NEDEN: Favoriler yalnız o cihazın localStorage'ında duruyordu; başka cihazda, telefon
-- uygulamasında ya da başka tarayıcıda görünmüyor, kullanıcı "favorilerim kayboldu" sanıyordu.
-- Artık hesapta. Uygulama localStorage'ı anlık önbellek + çevrimdışı kuyruk olarak kullanmaya
-- devam eder; her cihaz ilk açılışta kendi eski favorilerini bir kez yükler (birleşim korunur).
-- Bu tablo yokken uygulama eskisi gibi yalnız cihazda çalışır (404 → sessiz).

create table if not exists public.work_favorites (
  user_id    uuid        not null references auth.users (id) on delete cascade,   -- hesap silinince favoriler de gider
  work_id    bigint      not null,   -- works'e FK YOK: silinmiş/eski bir eser kimliği toplu yüklemeyi bozmasın
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

-- Kişi yalnız KENDİ favorilerini görür, ekler, siler.
alter table public.work_favorites enable row level security;
drop policy if exists work_favorites_select on public.work_favorites;
drop policy if exists work_favorites_insert on public.work_favorites;
drop policy if exists work_favorites_delete on public.work_favorites;
create policy work_favorites_select on public.work_favorites for select to authenticated using (auth.uid() = user_id);
create policy work_favorites_insert on public.work_favorites for insert to authenticated with check (auth.uid() = user_id);
create policy work_favorites_delete on public.work_favorites for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.work_favorites to authenticated;

comment on table public.work_favorites is
  'Kullanıcının favori eserleri (hesaba bağlı, cihazlar arası). Uygulamada localStorage yalnız önbellek/çevrimdışı kuyruk.';

notify pgrst, 'reload schema';
