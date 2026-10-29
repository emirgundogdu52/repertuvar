-- KATALOĞUN TAMAMINI AÇMA (2026-10-29, yayın gecesi) — kullanıcı kararı: "B" (telifli sözler dahil her şey açılsın)
--
-- Ne yapar:
--   1) works_telif_yedek'teki 368 eserin söz / akor / nota alanlarını works'e geri koyar (2026-10-09 telif_soz_gizleme.sql'in tersi).
--      Yalnız alan hâlâ boşsa yazar: gizlemeden sonra biri doldurduysa onun yazdığı korunur.
--   2) works_katalog_yedek'teki 683 eserin görünürlüğünü eski değerine (public) döndürür (2026-10-10 katalog_100_paket.sql'in tersi).
--   Yedek tablolar SİLİNMEZ: yeniden gizlemek gerekirse aşağıdaki YENİDEN GİZLEME bloğu kullanılır.
--
-- Bilerek alınan risk (kullanıcıya 2026-10-29'da anlatıldı, karar kullanıcıda): bu sözlerin MESAM/MSG lisansı yok, eserlerin çoğunu
-- ekip ekledi; Apple 2.1 cevabında telifli sözlerin gizlendiği söylenmişti (5.2 / 2.3.1). Hak sahibi şikâyetinde ilgili eser
-- YENİDEN GİZLEME bloğundaki tek eser satırıyla hemen kapatılır.
--
-- Tetikleyici: protect_work_moderation SQL Editor'de (auth.uid() null) satıra dokunmaz → status 'approved' kalır.

begin;

update public.works w
   set lyrics     = coalesce(w.lyrics, t.lyrics),
       chords     = coalesce(w.chords, t.chords),
       nota_url   = coalesce(w.nota_url, t.nota_url),
       nota_pages = case when w.nota_pages is null or w.nota_pages = '[]'::jsonb then coalesce(t.nota_pages, '[]'::jsonb) else w.nota_pages end
  from public.works_telif_yedek t
 where w.id = t.work_id
   and w.deleted_at is null;

update public.works w
   set visibility = y.eski_visibility
  from public.works_katalog_yedek y
 where w.id = y.work_id
   and w.visibility = 'private'
   and w.deleted_at is null;

-- Kontrol: genel eser 785 civarı, telif yedeğindeki eserlerde boş kalan 0
select
  (select count(*) from public.works where deleted_at is null and (visibility is null or visibility = 'public')) as genel_eser,
  (select count(*) from public.works w join public.works_katalog_yedek y on y.work_id = w.id where w.visibility = 'private') as hala_gizli,
  (select count(*) from public.works w join public.works_telif_yedek t on t.work_id = w.id
    where w.lyrics is distinct from t.lyrics or w.chords is distinct from t.chords) as yedekten_farkli;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- YENİDEN GİZLEME
--   Tek eser (ör. hak sahibi şikâyeti; id'yi yaz):
--     update public.works set lyrics = null, chords = null, nota_url = null, nota_pages = '[]'::jsonb where id = /* id */;
--     update public.works set visibility = 'private' where id = /* id */;
--   Hepsi (bu dosyanın tersi):
--     update public.works w set lyrics = null, chords = null, nota_url = null, nota_pages = '[]'::jsonb
--       from public.works_telif_yedek t where w.id = t.work_id;
--     update public.works w set visibility = 'private'
--       from public.works_katalog_yedek y where w.id = y.work_id and (w.visibility is null or w.visibility = 'public');
