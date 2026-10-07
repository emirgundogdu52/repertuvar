-- 2026-10-07 — Kayıt sonrası müzik tercihi + eser dili.
-- Supabase → SQL Editor'de BİR KEZ çalıştırılır. Tekrar çalıştırmak zararsızdır (if not exists / drop if exists).
--
-- ÜÇ BAĞIMSIZ EKSEN (birbirine bağlanmaz):
--   1) Arayüz dili   → profiles.ui_lang          (ZATEN VAR — yeni alan açılmadı)
--   2) Müzik türü    → profiles.music_preferences (BU DOSYA)
--   3) Eser dili     → works.dil                  (BU DOSYA)
-- Örnek: ui_lang='en', music_preferences={turkish_folk,anatolian_rock} → İngilizce arayüz, Türk müziği içeriği.
--
-- Uygulama kodu bu sütunlar YOKKEN de çalışır (onboarding.js 400 alınca sessizce bekler);
-- yani kod bu SQL'den önce ya da sonra yayınlanabilir.

-- 1) Kullanıcının ilgilendiği müzik türleri — görünen metin DEĞİL, SABİT anahtar.
--    NULL = hiç sorulmadı · '{}' = "Şimdilik geç" · dolu = seçim.
--    Hiçbir eseri GİZLEMEZ: yalnız öneri/sıralama sinyali.
--    Yeni tür eklerken: app/onboarding.js (TURLER) + i18n.js (musicGenre.*) + aşağıdaki liste.
alter table public.profiles add column if not exists music_preferences text[];
alter table public.profiles drop constraint if exists profiles_music_preferences_check;
alter table public.profiles add constraint profiles_music_preferences_check check (
  music_preferences is null
  or music_preferences <@ array[
    'turkish_folk', 'turkish_classical', 'turkish_pop', 'anatolian_rock',
    'rock', 'pop', 'jazz', 'classical', 'world_traditional', 'other'
  ]::text[]
);
comment on column public.profiles.music_preferences is
  'Kullanıcının uğraştığı müzik türleri (sabit anahtarlar). NULL=sorulmadı, {}=geçti. Süzgeç değil, öneri sinyali. ui_lang ile ilgisi yok.';

-- 2) Eserin dili — ISO 639-1 iki harf (tr, en, de, nl …). Türden ve arayüz dilinden bağımsız.
--    Mevcut eserler 'tr' olur (katalog bugün Türkçe).
alter table public.works add column if not exists dil text not null default 'tr';
alter table public.works drop constraint if exists works_dil_check;
alter table public.works add constraint works_dil_check check (dil ~ '^[a-z]{2}$');
create index if not exists works_dil_idx on public.works (dil);
comment on column public.works.dil is
  'Eserin (sözlerinin) dili, ISO 639-1. Müzik türü (tur) ve arayüz dili (profiles.ui_lang) ile karıştırılmaz.';

-- 3) RLS: yeni sütunlar mevcut politikaların altında (ek politika gerekmez).

-- PostgREST yeni sütunları hemen görsün
notify pgrst, 'reload schema';
