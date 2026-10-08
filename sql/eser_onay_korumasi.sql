-- ESER ONAY KORUMASI (2026-10-08)
--
-- SORUN: works tablosunda tetikleyici yoktu. works_insert her oturumlu kullanıcıya açık, works_read ise
-- visibility 'public'/NULL olan eseri status'a bakmadan herkese gösteriyor; uygulama yalnız
-- status='pending' olanı istemcide gizliyor. Uygulamayı kullanmadan doğrudan API'ye
-- {visibility:'public', status:'approved'} gönderen biri eseri ONAYSIZ olarak herkesin kataloğuna
-- sokabiliyordu; sahibi de works_update ile kendi bekleyen eserini 'approved' yapabiliyordu.
-- (Apple inceleme notunda "herkese açık içerik ekibimizce onaylanmadan yayınlanmaz" diyoruz.)
--
-- KURAL (editör/admin ve SQL Editor/service_role SERBEST — onlar zaten onaylıyor):
--   EKLEME : genel (public ya da NULL görünürlük) eser her zaman 'pending' doğar; submitted_by = ekleyen;
--            reviewed_by/reviewed_at boş.  Kişisel/grup eser serbest (uygulama 'approved' yazıyor).
--   GÜNCELLEME:
--     · genel kalan eserin status'ü kullanıcıca değişmez (pending → approved olamaz);
--     · genel olmayan eser genele açılırsa 'pending' olur (uygulamanın yaptığıyla aynı);
--     · genelden kişisele/gruba çekmek serbest (onerilerim.html "geri çek": private + approved);
--     · submitted_by / reviewed_by / reviewed_at başka değere çekilemez, YALNIZ NULL'a çekilebilir —
--       delete_my_account() auth.uid() ile çalışıp bunları NULL yapıyor; engellenirse auth.users silinirken
--       works_submitted_by_fkey hatası verir ve hesap silme BOZULUR.
--
-- Uygulamadaki akışlar bozulmaz: eserler.html yeni/düzenle, onerilerim.html geri çek / geri yükle,
-- nota/akor PATCH'leri, silme (deleted_at) — hepsi bu kurallarla aynı sonucu veriyor.
-- Test: canlıda tek DO bloğu içinde kurulup test edildi, sonda hata fırlatılarak GERİ ALINDI (kalıcı değil).

create or replace function public.protect_work_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  yeni_genel boolean;
  eski_genel boolean;
begin
  if auth.uid() is null then return new; end if;                       -- SQL Editor / service_role
  if public.is_editor_or_admin() or public.is_app_admin() then return new; end if;

  yeni_genel := coalesce(new.visibility, 'public') = 'public';

  if tg_op = 'INSERT' then
    new.submitted_by := auth.uid();
    new.reviewed_by  := null;
    new.reviewed_at  := null;
    if yeni_genel then new.status := 'pending'; end if;
    return new;
  end if;

  -- UPDATE
  eski_genel := coalesce(old.visibility, 'public') = 'public';
  if new.submitted_by is not null then new.submitted_by := old.submitted_by; end if;
  if new.reviewed_by  is not null then new.reviewed_by  := old.reviewed_by;  end if;
  if new.reviewed_at  is not null then new.reviewed_at  := old.reviewed_at;  end if;
  if yeni_genel then
    if eski_genel then
      new.status := old.status;
    else
      new.status := 'pending';
    end if;
  end if;
  return new;
end
$fn$;

drop trigger if exists trg_protect_work_moderation on public.works;
create trigger trg_protect_work_moderation
  before insert or update on public.works
  for each row execute function public.protect_work_moderation();

-- GERİ ALMA (gerekirse):
--   drop trigger if exists trg_protect_work_moderation on public.works;
--   drop function if exists public.protect_work_moderation();
