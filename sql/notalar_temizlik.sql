-- NOTALAR DEPO TEMİZLİĞİ (2026-10-22) — notalar_depo_korumasi.sql'in devamı (nota_yetkili oradan)
--
-- SORUN: notalar kovasında DELETE kuralı yoktu. Nota sayfası döndürülünce/kırpılınca yeni dosya yükleniyor, sayfa ya da
--   notanın tamamı silinince yalnız works.nota_pages'ten çıkıyordu → eski dosyalar depoda kalıyor, depo büyüyordu
--   (2026-10-22: 72 dosyanın 9'u hiçbir yerden gösterilmiyordu).
--
-- KURAL (notalar_delete): dosyayı yalnız o eserin sahibi ya da editör/admin silebilir (nota_yetkili) VE dosya hiçbir
--   yerde kullanılmıyor olmalı: hiçbir works / works_telif_yedek satırının nota_pages'inde ya da eski nota_url
--   sütununda geçmemeli. Böylece istemci bayat bir listeyle yanlış dosyayı silmeye kalksa bile sunucu reddeder;
--   başka bir eserin aynı adresi kullandığı durumda da dosya korunur.
-- İstemci (eserler.html saveNotaPages → _notaDepodanSil): yeni liste sunucuya YAZILDIKTAN SONRA listeden çıkan
--   ve bu eserin klasöründe olan dosyaları siler; hata sessiz (eski uygulama sürümleri hiç silmez, sorun değil).
-- Not: Storage API silerken DELETE ... RETURNING yapar → silen kişinin dosyayı görebilmesi gerekir (notalar_read
--   aynı nota_yetkili ile buna izin veriyor).
-- Test: canlıda tek DO bloğu içinde kurulup denendi (9/9), sonda hata fırlatılarak GERİ ALINDI.

create or replace function public.nota_kullaniliyor(yol text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
           select 1 from public.works w
           cross join lateral jsonb_array_elements_text(
             case when jsonb_typeof(w.nota_pages) = 'array' then w.nota_pages else '[]'::jsonb end) e(adres)
           where right(e.adres, length(yol) + 9) = '/notalar/' || yol)
      or exists (select 1 from public.works w where right(w.nota_url, length(yol) + 9) = '/notalar/' || yol)
      or exists (
           select 1 from public.works_telif_yedek y
           cross join lateral jsonb_array_elements_text(
             case when jsonb_typeof(y.nota_pages) = 'array' then y.nota_pages else '[]'::jsonb end) e(adres)
           where right(e.adres, length(yol) + 9) = '/notalar/' || yol)
      or exists (select 1 from public.works_telif_yedek y where right(y.nota_url, length(yol) + 9) = '/notalar/' || yol);
$fn$;

drop policy if exists notalar_delete on storage.objects;
create policy notalar_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'notalar' and public.nota_yetkili(name) and not public.nota_kullaniliyor(name));

-- GERİ ALMA (gerekirse):
--   drop policy if exists notalar_delete on storage.objects;
--   drop function if exists public.nota_kullaniliyor(text);
