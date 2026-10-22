-- NOTALAR DEPO KORUMASI (2026-10-22)
--
-- SORUN 1 (yükleme): notalar_upload yalnız bucket_id='notalar' bakıyordu → giriş yapan HERKES kovanın her yerine
--   (başka birinin eserinin klasörüne, kök dizine, istediği adla) dosya bırakabiliyordu. Tür ve boyut sınırı da yoktu
--   (kova herkese açık: HTML/SVG dahil her dosya supabase.co adresinden dağıtılabilirdi).
-- SORUN 2 (listeleme): notalar_read role=public, yalnız bucket_id → anahtarsız (anon) biri bile kovayı LİSTELEYİP
--   gizli eserlerin nota sayfalarının adreslerini bulabiliyordu. Herkese açık kovada dosya göstermek için SELECT
--   kuralı gerekmez (public/ adresi kuralları atlar) — Supabase denetimi: "public bucket allows listing".
--
-- KURAL:
--   Yol works/<eser_id>/<dosya> olmalı ve yükleyen o eserin sahibi (submitted_by) ya da editör/admin olmalı —
--   works_update ile aynı kişiler (nota_pages'i zaten yalnız onlar kaydedebiliyor).
--   SELECT yalnız aynı kişilere + dosyanın sahibine (storage yüklemede INSERT ... RETURNING / upsert yaptığı için
--   yükleyenin yeni satırı görebilmesi şart; x-upsert:true gönderen eski sürümler de bu yüzden çalışmaya devam eder).
--   Kova: dosya başına 15 MB (istemcideki NOTA_MAX_BYTES), yalnız görsel/PDF türleri. application/octet-stream
--   bırakıldı: tarayıcı türü boş bildirirse istemci bunu gönderiyor; bu tür indirilir, sayfada çalıştırılmaz.
--
-- Etkilenmeyenler: public/ adresinden nota gösterimi, service-worker önbelleği, notaIndir (hepsi public/ adresi);
--   SQL Editor / service_role yüklemeleri (en/… dosyaları) RLS'e takılmaz.
-- Mevcut 72 dosyanın hepsi uygun: works/ altındaki 22'nin yükleyeni ya eser sahibi ya admin (2026-10-22 sayıldı).
-- Test: canlıda tek DO bloğu içinde kurulup denendi, sonda hata fırlatılarak GERİ ALINDI; sonra kalıcı uygulandı.

create or replace function public.nota_yetkili(yol text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when array_length(storage.foldername(yol), 1) = 2
     and (storage.foldername(yol))[1] = 'works'
     and (storage.foldername(yol))[2] ~ '^[0-9]{1,18}$'
    then public.work_sahibiyim(((storage.foldername(yol))[2])::bigint)
      or public.is_editor_or_admin()
      or public.is_app_admin()
    else false
  end;
$fn$;

drop policy if exists notalar_upload on storage.objects;
create policy notalar_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'notalar' and public.nota_yetkili(name));

drop policy if exists notalar_read on storage.objects;
create policy notalar_read on storage.objects
  for select to authenticated
  using (bucket_id = 'notalar' and (owner_id = (auth.uid())::text or public.nota_yetkili(name)));

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/gif',
                                  'image/heic','image/heif','image/tiff','application/pdf',
                                  'application/octet-stream']
 where id = 'notalar';

-- GERİ ALMA (gerekirse — eski, açık durum):
--   drop policy if exists notalar_upload on storage.objects;
--   create policy notalar_upload on storage.objects for insert to authenticated with check (bucket_id = 'notalar');
--   drop policy if exists notalar_read on storage.objects;
--   create policy notalar_read on storage.objects for select to public using (bucket_id = 'notalar');
--   update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'notalar';
--   drop function if exists public.nota_yetkili(text);
