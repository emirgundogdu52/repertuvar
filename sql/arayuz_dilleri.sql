-- ARAYÜZ DİLLERİ (2026-10-29) — kullanıcı: 8 yeni dil (de, nl, fr, es, it, pt, az, ar) iOS 1.1 / AAB 18 ile.
-- profiles.ui_lang yalnız 'tr' ve 'en' kabul ediyordu → yeni dili seçen kullanıcının tercihi sunucuya yazılamazdı
-- (cihazda kalır, öteki cihazlara geçmezdi). Veri değişmez; yalnız kısıt genişler.
begin;
alter table public.profiles drop constraint if exists profiles_ui_lang_check;
alter table public.profiles add constraint profiles_ui_lang_check
  check (ui_lang is null or ui_lang = any (array['tr', 'en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'az', 'ar']));
commit;
-- GERİ ALMA (yeni dil seçmiş kullanıcı varsa önce onları 'en' yap):
-- update public.profiles set ui_lang = 'en' where ui_lang not in ('tr', 'en');
-- alter table public.profiles drop constraint if exists profiles_ui_lang_check;
-- alter table public.profiles add constraint profiles_ui_lang_check check (ui_lang is null or ui_lang = any (array['tr', 'en']));
