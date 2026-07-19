-- ═══════════════════════════════════════════════════════════════════════════
-- MAKAM REFERANS TABLOSU — 2026-07-19
-- Amaç: works.makam serbest metnini, sıralama motorunun kullanabileceği
--       yapısal veriye bağlamak (karar sesi, aile, güçlü perde, seyir).
--
-- ÖNEMLİ: karar_latin YALNIZCA SIRALAMA İÇİNDİR. Türk müziğinin koma sesleri
-- 12 eşit aralığa oturmaz; Segâh'ın si'si ile Batı'nın si bemolü aynı değildir.
-- Uygulama ekranda her zaman PERDE ADINI gösterir, bu sütunu değil.
--
-- Supabase → SQL Editor'da sırayla çalıştır.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── ADIM 0 — Önce kendi verine bak ────────────────────────────────────────
-- Aşağıdaki sorgu, kütüphanendeki makamları çokluk sırasıyla listeler.
-- Seed'deki 20 makam senin ilk 20'ni karşılıyor mu, buradan görürsün.
--
--   select makam, count(*) as adet
--     from public.works
--    where coalesce(makam,'') <> ''
--    group by 1 order by 2 desc limit 30;


-- ─── ADIM 1 — Yazım normalleştirici ────────────────────────────────────────
-- "Uşşak", "ussak", "UŞŞAK", "Uşşâk" hepsi aynı anahtara iner.
create or replace function public.makam_norm(t text)
returns text language sql immutable as $$
  select regexp_replace(
           lower(translate(coalesce(t,''),
             'ÂÎÛâîûİIıŞşĞğÜüÖöÇç',
             'AIUaiuIIiSsGgUuOoCc')),
           '[^a-z0-9]', '', 'g')
$$;


-- ─── ADIM 2 — Tablo ────────────────────────────────────────────────────────
create table if not exists public.makams (
  id           serial primary key,
  ad           text not null unique,   -- "Uşşak"
  aile         text,                   -- "Uşşak" · "Hicaz" · "Buselik" · "Segâh" · "Çargâh" · "Kürdi" · "Saba"
  karar_perde  text,                   -- "Dügâh"  ← ekranda gösterilen
  karar_latin  text,                   -- "A"      ← YALNIZCA sıralama hesabı için
  guclu_perde  text,                   -- "Neva"
  seyir        text,                   -- çıkıcı / inici / çıkıcı-inici
  aliases      text[] default '{}',    -- yaygın yazım farkları
  notlar       text
);

alter table public.makams enable row level security;

-- Herkes okuyabilir; yazma yok (yalnız SQL Editor / service role ekler).
drop policy if exists makams_read on public.makams;
create policy makams_read on public.makams for select using (true);

create index if not exists makams_norm_idx on public.makams (public.makam_norm(ad));


-- ─── ADIM 3 — Seed: en sık 20 makam ────────────────────────────────────────
-- Perde → yaklaşık latin karşılığı (bolâhenk/nota yazımı esas alınmıştır):
--   Rast=G · Dügâh=A · Segâh=B · Çargâh=C · Neva=D · Hüseyni=E · Acem=F
--   Gerdaniye=G · Acemaşiran=F · Yegâh=D
insert into public.makams (ad, aile, karar_perde, karar_latin, guclu_perde, seyir, aliases, notlar) values
  ('Rast',            'Rast',    'Rast',       'G', 'Neva',    'çıkıcı',        '{"rast"}',                          null),
  ('Uşşak',           'Uşşak',   'Dügâh',      'A', 'Neva',    'çıkıcı',        '{"Ussak","Uşşâk","Usak"}',          null),
  ('Beyati',          'Uşşak',   'Dügâh',      'A', 'Neva',    'çıkıcı-inici',  '{"Beyatî","Bayati"}',               null),
  ('Hüseyni',         'Uşşak',   'Dügâh',      'A', 'Hüseyni', 'çıkıcı',        '{"Huseyni","Hüseynî"}',             null),
  ('Muhayyer',        'Uşşak',   'Dügâh',      'A', 'Hüseyni', 'inici',         '{"Muhayer"}',                       null),
  ('Karcığar',        'Uşşak',   'Dügâh',      'A', 'Neva',    'çıkıcı',        '{"Karcigar","Karcığâr"}',           'Uşşak + Hicaz birleşimi'),
  ('Hicaz',           'Hicaz',   'Dügâh',      'A', 'Neva',    'çıkıcı',        '{"Hicâz"}',                         null),
  ('Hümayun',         'Hicaz',   'Dügâh',      'A', 'Neva',    'çıkıcı-inici',  '{"Humayun","Hicaz Hümayun"}',       null),
  ('Uzzal',           'Hicaz',   'Dügâh',      'A', 'Hüseyni', 'çıkıcı',        '{"Uzzâl","Hicaz Uzzal"}',           null),
  ('Zirgüleli Hicaz', 'Hicaz',   'Dügâh',      'A', 'Neva',    'çıkıcı-inici',  '{"Zirguleli Hicaz","Zirgüleli"}',   null),
  ('Hicazkâr',        'Hicaz',   'Rast',       'G', 'Neva',    'inici',         '{"Hicazkar"}',                      null),
  ('Kürdi',           'Kürdi',   'Dügâh',      'A', 'Neva',    'çıkıcı',        '{"Kurdi","Kürdî"}',                 null),
  ('Kürdilihicazkâr', 'Kürdi',   'Rast',       'G', 'Neva',    'inici',         '{"Kurdilihicazkar","Kürdili"}',     null),
  ('Muhayyerkürdi',   'Kürdi',   'Dügâh',      'A', 'Hüseyni', 'inici',         '{"Muhayyer Kürdi","Muhayyerkurdi"}',null),
  ('Nihavend',        'Buselik', 'Rast',       'G', 'Neva',    'çıkıcı-inici',  '{"Nihavent","Nihâvend"}',           null),
  ('Buselik',         'Buselik', 'Dügâh',      'A', 'Hüseyni', 'çıkıcı',        '{"Bûselik","Buselık"}',             null),
  ('Nikriz',          'Buselik', 'Rast',       'G', 'Neva',    'çıkıcı',        '{"Nikrîz"}',                        null),
  ('Segâh',           'Segâh',   'Segâh',      'B', 'Neva',    'çıkıcı',        '{"Segah","Segâh"}',                 'Karar koma sesidir; latin karşılık yaklaşıktır'),
  ('Hüzzam',          'Segâh',   'Segâh',      'B', 'Eviç',    'çıkıcı',        '{"Huzzam","Hüzzâm"}',               'Karar koma sesidir; latin karşılık yaklaşıktır'),
  ('Saba',            'Saba',    'Dügâh',      'A', 'Çargâh',  'çıkıcı',        '{"Sabâ"}',                          'Saba dizisi tampere sistemle örtüşmez'),
  ('Mahur',           'Çargâh',  'Rast',       'G', 'Gerdaniye','inici',        '{"Mahûr"}',                         null),
  ('Acemaşiran',      'Çargâh',  'Acem aşiran','F', 'Çargâh',  'inici',         '{"Acemasiran","Acem Aşiran"}',      null)
on conflict (ad) do nothing;


-- ─── ADIM 4 — Eşleşmeyenleri gör (eşleştirme ekranının girdisi) ────────────
create or replace view public.eslesmeyen_makamlar as
select w.makam as yazim, count(*) as eser_sayisi
  from public.works w
 where coalesce(w.makam,'') <> ''
   and not exists (
     select 1 from public.makams m
      where public.makam_norm(m.ad) = public.makam_norm(w.makam)
         or exists (select 1 from unnest(m.aliases) a
                     where public.makam_norm(a) = public.makam_norm(w.makam))
   )
 group by 1
 order by 2 desc;

-- Kullanım:  select * from public.eslesmeyen_makamlar;
--
-- Çıkan yazımlardan biri aslında mevcut bir makamsa, alias olarak ekle:
--   update public.makams
--      set aliases = aliases || '{"YENİ YAZIM"}'
--    where ad = 'Uşşak';
--
-- Gerçekten yeni bir makamsa satır ekle:
--   insert into public.makams (ad, aile, karar_perde, karar_latin, guclu_perde, seyir)
--   values ('Şehnaz', 'Hicaz', 'Dügâh', 'A', 'Neva', 'inici');
