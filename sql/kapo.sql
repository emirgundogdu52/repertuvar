-- KİŞİSEL KAPO (2026-10-27)
--
-- Kullanıcı: "Bir de Kapo seçeneği ekleyelim mi?" (akorlar.com'dan alınan akorlar konuşulurken). Kapo, ton gibi
-- çalanın kişisel tercihidir: eser başına, kullanıcıya özel, cihazlar arası → personal_chords'a bir sütun.
--
-- ANLAMI: transpose (mevcut) = duyulan sesin orijinale göre kayması; capo = perde. Ekranda akorlar (transpose − capo)
-- kadar kaydırılmış ŞEKİLLE çizilir; TON adı ve karar duyulan sesi (transpose) gösterir. Örnek: Ankara'nın Bağları
-- orijinal A (Em şekilleri), ton B (+2) + kapo 2 → ekranda yine Em şekilleri, "Ton B · Kapo 2 · Karar F#".
--
-- ESERE SÜTUN EKLENMİYOR: kaynağında "Capo: 2" yazan şarkı içe aktarılırken akorlar bir kez duyulan sese çevrilip
-- kaydedilir (şekil + 2), içe aktaranın kişisel kaposu 2 yapılır → kaynaktaki şekiller aynen görünür, katalog tek
-- (duyulan) tonda kalır.
--
-- UYUMLULUK: varsayılan 0. Mağazadaki sürümler ton kaydederken yalnız transpose gönderiyor (upsert,
-- resolution=merge-duplicates → yalnız gönderilen sütunlar güncellenir) → kapo ezilmez; yeni satırda 0 olur.
-- RLS (pc_select/insert/update/delete: auth.uid() = user_id) satır bazlı, yeni sütunu da kapsar. Tetikleyici yok.

alter table public.personal_chords
  add column if not exists capo smallint not null default 0;

alter table public.personal_chords
  drop constraint if exists personal_chords_capo_aralik;
alter table public.personal_chords
  add constraint personal_chords_capo_aralik check (capo between 0 and 11);

comment on column public.personal_chords.capo is
  'Kişisel kapo perdesi (0 = kaposuz). Akorlar (transpose - capo) şekliyle çizilir; ton ve karar duyulan sesi gösterir.';

-- DOĞRULAMA (çalıştırınca bakılacak):
--   select count(*) as satir, count(*) filter (where capo <> 0) as kapolu from public.personal_chords;   -- kapolu = 0
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'personal_chords_capo_aralik';   -- CHECK (0–11)
--
-- GERİ ALMA (gerekirse):
--   alter table public.personal_chords drop constraint if exists personal_chords_capo_aralik;
--   alter table public.personal_chords drop column if exists capo;
