-- GENEL KATALOĞU 100 ESERLİK PAKETE İNDİRME (2026-10-09)
--
-- NEDEN: Kullanıcı kararı (2026-10-09): Apple incelemesi öncesi genel katalogda yalnız 50 İngilizce (kamu malı) eser ile
-- 50 anonim türkü kalsın, gerisi gizlensin. Telifli olabilecek sözler zaten telif_soz_gizleme.sql ile boşaltılmıştı;
-- bu dosya eserlerin KENDİSİNİ (ad/künye dahil) genel listeden çeker.
-- YÖNTEM: visibility 'public'/NULL → 'private'. Eser SİLİNMEZ; eski değer works_katalog_yedek'te.
--   · Ekleyeni olan eser ekleyenin kendi listesinde görünmeye devam eder (kişisel eser olur).
--   · Ekleyeni olmayan (içe aktarılmış) eser yalnız admin/editöre görünür. BUNUN İÇİN works_read politikasına
--     "OR is_editor_or_admin()" eklenir: eski kural silinmemiş eserde admine ek okuma vermiyordu, gizlenen içe aktarılmış
--     eserleri admin de göremez ve Emir'in kendi repertuvarlarındaki eserler boşa düşerdi (2026-10-09 SQL Editor'de görüldü).
--   · Uygulama her senkronda okunabilir eserleri replaceAll ile yazdığı için cihaz önbelleklerinden de kalkar
--     (build 3 dahil, yeni derleme gerekmez).
--   · Başka kullanıcıların repertuvarlarındaki gizlenen eserler o kullanıcılara artık açılmaz (kullanıcı kabul etti).
-- KORUNANLAR (zorunlu): Sample Setlist (532, 213, 171, 212, 365 — demo hesap, Apple incelemesi), video eserleri
--   (532 Kızılcıklar, 526 Çökertme, 527 Bugün Ayın Işığı). 365'in sözü zaten gizli (besteci alanı dolu) ama demo
--   repertuvarı bozulmasın diye görünür kalır. Diğer 43 türkü: THM, besteci+söz yazarı boş/Anonim, sözlü,
--   makam/usul dolu, NOTA TARAMASI OLMAYAN (TRT taraması riski).
-- GERİ ALMA: dosyanın sonundaki blok.

create table if not exists public.works_katalog_yedek as
  select id as work_id, visibility as eski_visibility, now() as gizlendi_at
  from public.works where false;
alter table public.works_katalog_yedek enable row level security;   -- politika yok: yalnız SQL Editor / service_role
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'works_katalog_yedek_pkey') then
    alter table public.works_katalog_yedek add constraint works_katalog_yedek_pkey primary key (work_id);
  end if;
end $$;

drop table if exists katalog_tut;
create temp table katalog_tut (id bigint primary key, dil text);
insert into katalog_tut (id, dil) values
  (532, 'tr'),   -- Kızılcıklar Oldu mu?
  (213, 'tr'),   -- Sabahın Seherinde Ötüyor Kuşlar
  (171, 'tr'),   -- Bir İncecik Duman Tüter Bacadan
  (212, 'tr'),   -- Şu Yüce Dağların Karı Eridi
  (365, 'tr'),   -- Bir Gemim Var Adalara Yaslanır
  (526, 'tr'),   -- ÇÖKERTME
  (527, 'tr'),   -- Bugün Ayın Işığı
  (531, 'tr'),   -- Çayır Çimen Geze Geze
  (293, 'tr'),   -- Çarşamba'yı Sel Aldı
  (184, 'tr'),   -- Eklemedir koca konak ekleme
  (1660, 'tr'),   -- Atım Araptır Benim
  (311, 'tr'),   -- Drama köprüsü
  (524, 'tr'),   -- BAHÇADA YEŞİL ÇINAR
  (1936, 'tr'),   -- Deriko
  (168, 'tr'),   -- Yarim derdini ver bana Dermanın olayım senin
  (1700, 'tr'),   -- Yarim Senden Ayrılalı
  (1707, 'tr'),   -- Aşağıdan Gelir Omuz Omuza
  (1799, 'tr'),   -- Yol Üstünde Dikili Taş
  (1909, 'tr'),   -- Yayla Yolları
  (1830, 'tr'),   -- TÜKENMEK BİLMİYOR KARA GÜNLERİM
  (1844, 'tr'),   -- KARALI BAYRAK KALDIRDIM
  (1795, 'tr'),   -- Keklik İdim Vurdular
  (1632, 'tr'),   -- Dere Geliyor Dere
  (163, 'tr'),   -- Mendilimin Yeşili
  (196, 'tr'),   -- Akşam Olur Karanlığa Kalırsın
  (1677, 'tr'),   -- Penceresi Yola Karşı
  (1811, 'tr'),   -- Dağlar Seni Delik Delik Delerim
  (1863, 'tr'),   -- YAZ AYLARI GELDİ GEÇTİ
  (1822, 'tr'),   -- İndim Dere Beklerim
  (1715, 'tr'),   -- Huma Kuşu
  (1641, 'tr'),   -- Karpuz Kestim Yiyen Yok
  (1752, 'tr'),   -- Seher Yeli Nazlı Yare
  (1680, 'tr'),   -- Yüksek Minarede Kandiller Yanar
  (1891, 'tr'),   -- Aman Eşref
  (1670, 'tr'),   -- Kara Basma İz Olur
  (1823, 'tr'),   -- Mendil Aldım Bir Deste
  (1701, 'tr'),   -- Zeynep Bu Güzellik Var Mı Soyunda
  (1667, 'tr'),   -- Havada Turna Sesi Var
  (1819, 'tr'),   -- Güvercin Uçuverdi
  (1762, 'tr'),   -- Cemo
  (1866, 'tr'),   -- YÜRÜ GÜZEL YÜRÜ SAÇIN SÜRÜNSÜN
  (1636, 'tr'),   -- Esmerim Biçim Biçim
  (1807, 'tr'),   -- Çamdan Sakız Akıyor
  (1840, 'tr'),   -- KARANFİL OYLUM OYLUM
  (1652, 'tr'),   -- Tabancamın Sapını
  (1771, 'tr'),   -- Uzun Kavak Ne Uzarsın Boyuna
  (1633, 'tr'),   -- Elindedir Bağlama
  (1754, 'tr'),   -- Ankara'nın Bağları
  (1672, 'tr'),   -- Kiraz Aldım Dikmeden
  (1729, 'tr'),   -- Çalın Davulları
  (1947, 'en'),
  (1948, 'en'),
  (1949, 'en'),
  (1950, 'en'),
  (1951, 'en'),
  (1952, 'en'),
  (1953, 'en'),
  (1954, 'en'),
  (1955, 'en'),
  (1956, 'en'),
  (1957, 'en'),
  (1958, 'en'),
  (1959, 'en'),
  (1960, 'en'),
  (1961, 'en'),
  (1962, 'en'),
  (1963, 'en'),
  (1964, 'en'),
  (1965, 'en'),
  (1966, 'en'),
  (1967, 'en'),
  (1968, 'en'),
  (1969, 'en'),
  (1970, 'en'),
  (1971, 'en'),
  (1972, 'en'),
  (1973, 'en'),
  (1974, 'en'),
  (1975, 'en'),
  (1976, 'en'),
  (1977, 'en'),
  (1978, 'en'),
  (1979, 'en'),
  (1980, 'en'),
  (1981, 'en'),
  (1982, 'en'),
  (1983, 'en'),
  (1984, 'en'),
  (1985, 'en'),
  (1986, 'en'),
  (1987, 'en'),
  (1988, 'en'),
  (1989, 'en'),
  (1990, 'en'),
  (1991, 'en'),
  (1992, 'en'),
  (1993, 'en'),
  (1994, 'en'),
  (1995, 'en'),
  (1996, 'en');

-- Güvenlik: listede 100 eser olmalı ve hepsi şu an genel+onaylı+silinmemiş olmalı; değilse HİÇBİR ŞEY yapma.
do $$
declare n int; m int;
begin
  select count(*) into n from katalog_tut;
  select count(*) into m from katalog_tut t join public.works w on w.id = t.id
   where w.deleted_at is null and w.status = 'approved' and (w.visibility is null or w.visibility = 'public');
  if n <> 100 or m <> 100 then raise exception 'Liste tutarsız: % satır, % genel eser — işlem iptal', n, m; end if;
end $$;

-- Admin/editör gizli eserleri de okuyabilsin (yalnız silinmemiş eser dalına ekleme; geri kalan kural aynen).
-- Eski kural (geri alma için):
--   CASE WHEN (deleted_at IS NULL) THEN ((visibility = 'public'::text) OR (visibility IS NULL) OR (submitted_by = auth.uid())
--     OR ((visibility = 'group'::text) AND work_grup_paylasimi(id))) ELSE ((submitted_by = auth.uid()) OR is_editor_or_admin()) END
do $$
declare q text; yeni text;
begin
  select qual into q from pg_policies where schemaname = 'public' and tablename = 'works' and policyname = 'works_read';
  if q is null then raise exception 'works_read bulunamadı — işlem iptal'; end if;
  -- pg_policies.qual satırlara bölünmüş gelir ("...(id)))\n    ELSE ..."): boşluktan bağımsız düzenli ifade
  if q ~ 'is_editor_or_admin\(\)\)\s*ELSE' then return; end if;   -- zaten eklenmiş
  yeni := regexp_replace(q, 'work_grup_paylasimi\(id\)\)\)(\s*)ELSE', 'work_grup_paylasimi(id)) OR is_editor_or_admin())\1ELSE');
  if yeni = q then raise exception 'works_read beklenen biçimde değil — işlem iptal: %', q; end if;
  execute format('alter policy works_read on public.works using (%s)', yeni);
end $$;

insert into public.works_katalog_yedek (work_id, eski_visibility, gizlendi_at)
  select w.id, w.visibility, now() from public.works w
  where w.deleted_at is null and (w.visibility is null or w.visibility = 'public')
    and w.id not in (select id from katalog_tut)
on conflict (work_id) do nothing;

update public.works w set visibility = 'private'
  where w.deleted_at is null and (w.visibility is null or w.visibility = 'public')
    and w.id not in (select id from katalog_tut);

-- Kontrol: genel kalan 100 (50 tr + 50 en), yedekte gizlenen sayısı
select
  (select count(*) from public.works where deleted_at is null and (visibility is null or visibility = 'public')) as genel_kalan,
  (select count(*) from public.works w join katalog_tut t on t.id = w.id where t.dil = 'en' and w.visibility = 'public') as genel_en,
  (select count(*) from public.works_katalog_yedek) as gizlenen,
  (select qual ~ 'is_editor_or_admin\(\)\)\s*ELSE' from pg_policies
    where schemaname = 'public' and tablename = 'works' and policyname = 'works_read') as admin_okur;

-- ─────────────────────────────────────────────────────────────────────────────
-- GERİ ALMA (hepsi):
--   update public.works w set visibility = y.eski_visibility
--     from public.works_katalog_yedek y where w.id = y.work_id and w.visibility = 'private';
--   delete from public.works_katalog_yedek;
--   alter policy works_read on public.works using (CASE WHEN (deleted_at IS NULL) THEN ((visibility = 'public'::text)
--     OR (visibility IS NULL) OR (submitted_by = auth.uid()) OR ((visibility = 'group'::text) AND work_grup_paylasimi(id)))
--     ELSE ((submitted_by = auth.uid()) OR is_editor_or_admin()) END);
-- TEK ESER GERİ AÇMA (ör. pakete eklenecek / lisans alınan):
--   update public.works w set visibility = y.eski_visibility
--     from public.works_katalog_yedek y where w.id = y.work_id and w.id in (/* id listesi */);
--   delete from public.works_katalog_yedek where work_id in (/* id listesi */);
