-- DEFTER OKUMA KAYDI (2026-10-22) — "📷 Defterden oku" / "📒 Defterden ekle" okumalarının kaydı (supabase/functions/defter-oku yazar).
--
-- NEDEN (kullanıcı kararı 2026-10-22): okuma ücretli bir ek özellik olabilir ("sınırlı adet verilir, fazlasını isteyen öder").
-- Test süresince model Opus 5.5 (~5 ¢/sayfa); 100 kullanıcı ya da 500 sayfa aşılınca Haiku 5.5 (~0,2 ¢) ya da ücretlendirme
-- yeniden değerlendirilecek. Bu tablo o eşiği izler ve ileride kişi başı kotayı sayar.
-- Görsel ya da okunan metin SAKLANMAZ: yalnız kim, ne zaman, hangi model/kip, kaç sayfa, kaç token.
-- Yalnız servis anahtarı yazar/okur (RLS açık, politika yok). Hesap silinince satır kalır, user_id boşalır (delete_my_account
-- auth.users satırını sildiğinde FK on delete set null). Sunucudan servis anahtarıyla yapılan denemelerde user_id boş.

create table if not exists public.defter_okuma_kayit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  mod text not null default '',
  sayfa int not null,
  girdi int not null default 0,
  cikti int not null default 0
);
alter table public.defter_okuma_kayit enable row level security;
create index if not exists defter_okuma_kayit_kisi_tarih on public.defter_okuma_kayit (user_id, created_at);

-- İZLEME (eşik: 100 kullanıcı / 500 sayfa; servis denemeleri hariç):
--   select count(distinct user_id) kullanici, coalesce(sum(sayfa), 0) sayfa,
--          round(coalesce(sum(case when model like 'claude-opus%' then girdi * 4e-6 + cikti * 20e-6
--                                  else girdi * 0.1e-6 + cikti * 0.5e-6 end), 0)::numeric, 2) dolar
--     from public.defter_okuma_kayit where user_id is not null;
--
-- GERİ ALMA: drop table if exists public.defter_okuma_kayit;
