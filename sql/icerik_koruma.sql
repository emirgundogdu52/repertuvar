-- İÇERİK KORUMA (2026-10-25) — kullanıcının iki isteği, iki karar:
--
--  (A) "Kötü niyetli biri tüm içeriğimizi alıp götüremesin" → KARAR: girişsiz okumayı kapat.
--      Durum: works_read politikası 'public' rolüne (anon dahil) açık ve anon'un works üzerinde SELECT izni var.
--      Uygulamanın içinde duran publishable anahtarla GİRİŞ YAPMADAN tek istekle genel kataloğun tamamı
--      (2026-10-25: 100 eser, 99'u sözlü) çekilebiliyordu. Kişisel/grup eserler RLS ile zaten korumalı.
--      Uygulama etkisi YOK: oturumlu her okuma kullanıcının jetonuyla gidiyor (auth.js fetch sarmalayıcısı);
--      anon yedek yalnız oturum yokken devreye giriyor ve hata aldığında önbelleği silmiyor (db.js `if (worksRes.ok)`,
--      stage.html anon yolu → IndexedDB). Paylaşım bağlantıları get_shared_repertoire (SECURITY DEFINER) ile
--      çalışıyor → etkilenmez. Mağazadaki eski sürümler de aynı kodla çalışıyor.
--      Ek: purge_deleted_works() (30 günlük çöpü kalıcı siler) anon dahil herkese çağrılabiliyordu → yalnız cron.
--
--  (B) "Küfürlü ve sakıncalı içerikleri süzecek bir filtre" → KARAR: paylaşılan alanlarda ENGELLE, şarkı sözünde UYAR.
--      · uygunsuz_kelimeler: yönetilen liste (seviye 'engel' | 'uyari'; eşleşme 'kelime' = tam sözcük, 'kok' = sözcük
--        başı, ek alabilir). Liste gizli depoda: veri/sql/uygunsuz_kelimeler_tohum.sql (açık depoya konmaz).
--      · uygunsuz_normal(): küçük harf (Türkçe I/İ doğru), leet (0→o 1→i 3→e 4→a 5→s 7→t @→a $→s), harf uzatma
--        (siiiktir → siktir), harf olmayan → boşluk (HER DİLİN harfi korunur: é ñ å ø í… kelimeyi bölmez).
--        ı/i AYRI tutulur: 'sıkıntı' ≠ 'sik…' (yanlış engel olmasın).
--      · DİLE DUYARLI (kullanıcı: "dünya marketine açılacak, diğer dillerde normal anlamı olan kelime küfür sayılmasın"):
--        her kelimenin `dil`i var — '*' = her dilde uygunsuz ve başka dilde masum anlamı olmayan (siktir, orospu,
--        motherfuck…); 'tr' / 'en' … = yalnız o dil bağlamında. Örnek çakışmalar: 'siker' Macarca "başarı", 'retard'
--        Fransızca "gecikme", 'slut' İsveççe "son", 'bok' İsveççe "kitap", 'pust' Rusça "olsun"; 'faggot' harf
--        sadeleştirince 'fagot' = Almanca/Hollandaca/Lehçe FAGOT (çalgı!) → listeye hiç alınmadı (fag/kike de: Norveççe
--        "ders", İspanyolca lakap). Bağlam dili: kullanıcının arayüz dili (profiles.ui_lang, yoksa 'tr') + metinde
--        Türkçeye özgü harf (ğ ı ş İ) varsa 'tr'. Yeni pazara açılınca o dilin listesi kendi `dil`iyle eklenir.
--      · uygunsuz_istisnalar: yanlış alarm veren masum ifadeler (yönetici ekler) metinden çıkarılıp sonra aranır.
--      · Tetikleyici (BEFORE INSERT/UPDATE, yalnız ilgili sütun değişince): başkalarının gördüğü alanlar —
--        repertoires (genel/grup iken ad, yer, not), repertoire_items.note (paylaşılan repertuvarda), groups (ad,
--        açıklama), profiles (görünen ad, ad soyad), solistler (ad, not). 'engel' seviyesinde kelime → kayıt reddedilir.
--        Hata: message = okunur Türkçe cümle (eski sürümler ham gösterse de anlaşılsın), hint = 'uygunsuz_icerik'
--        (yeni istemci auth.js bunu yakalayıp dile göre gösterir), detail = bulunan ifade.
--      · ŞARKI SÖZÜ / ESER ADI ENGELLENMEZ: türkülerde 'kahpe felek' gibi ifadeler var. Yalnız uygunsuz_tara() ile
--        içe aktarma kartında ve admin onay kuyruğunda uyarı (her iki seviye). Genel eser zaten ekip onayından geçiyor.
--      · Mesajlar (kullanıcı → destek) bilerek DIŞARIDA: uygunsuz içeriği bildiren kişi onu alıntılayabilmeli.
--      · Muaf: SQL Editor / service_role (auth.uid() boş), yönetici/editör.
--
-- ÇALIŞTIRMA: 1) bu dosya → 2) veri/sql/uygunsuz_kelimeler_tohum.sql → 3) DOĞRULAMA (en altta, salt okuma).
-- Geri alma: en alttaki GERİ AL bloğu.

-- ============================================================ (A) GİRİŞSİZ OKUMA KAPALI
revoke select on table public.works from anon;
revoke execute on function public.purge_deleted_works() from public, anon, authenticated;

-- ============================================================ (B) UYGUNSUZ İÇERİK FİLTRESİ
create or replace function public.uygunsuz_normal(t text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select ' ' || btrim(regexp_replace(regexp_replace(
           translate(lower(translate(coalesce(t, ''), 'IİŞĞÜÖÇÂÎÛ', 'ıişğüöçâîû')), '013457@$', 'oieastas'),
           '(.)\1+', '\1', 'g'),
         '[^[:alpha:]]+', ' ', 'g')) || ' '
$fn$;

create table if not exists public.uygunsuz_kelimeler (
  id         bigserial primary key,
  kelime     text not null check (char_length(kelime) between 2 and 60),
  normal     text generated always as (btrim(public.uygunsuz_normal(kelime))) stored,
  seviye     text not null default 'engel' check (seviye in ('engel', 'uyari')),
  eslesme    text not null default 'kok' check (eslesme in ('kelime', 'kok')),
  dil        text not null default '*' check (dil ~ '^(\*|[a-z]{2})$'),
  created_at timestamptz not null default now(),
  unique (normal, eslesme, dil)
);
-- Yanlış alarm veren masum ifadeler (çok sözcüklü olabilir: 'ibne insha'). Aramadan önce metinden çıkarılır.
create table if not exists public.uygunsuz_istisnalar (
  ifade      text primary key check (char_length(ifade) between 2 and 80),
  normal     text generated always as (btrim(public.uygunsuz_normal(ifade))) stored,
  aciklama   text,
  created_at timestamptz not null default now()
);
alter table public.uygunsuz_istisnalar enable row level security;
revoke all on table public.uygunsuz_istisnalar from anon, authenticated;
-- Liste istemciye açılmaz: politika yok → yalnız aşağıdaki SECURITY DEFINER işlevler ve SQL Editor okur.
alter table public.uygunsuz_kelimeler enable row level security;
revoke all on table public.uygunsuz_kelimeler from anon, authenticated;

-- Bağlam dilleri: kullanıcının arayüz dili (yoksa 'tr') + metinde Türkçeye özgü harf varsa 'tr'.
create or replace function public.uygunsuz_diller(p_metin text)
returns text[]
language sql
stable
security definer
set search_path = public
as $fn$
  select array_remove(array[
    coalesce((select nullif(lower(left(p.ui_lang, 2)), '') from public.profiles p where p.id = auth.uid()), 'tr'),
    case when coalesce(p_metin, '') ~ '[ğışĞŞİ]' then 'tr' end], null)
$fn$;

-- Metindeki ilk uygunsuz ifade (yoksa NULL). p_seviye: 'engel' yalnız engel listesi, 'hepsi' uyarılar dahil.
-- p_diller: bağlam dilleri (NULL → uygunsuz_diller). 'kok' 6+ harfliyse boşluksuz metinde de aranır ("s i k t i r").
drop function if exists public.uygunsuz_bul(text, text);
create or replace function public.uygunsuz_bul(p_metin text, p_seviye text default 'engel', p_diller text[] default null)
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  n text;
  s text;
  k record;
  diller text[];
begin
  if p_metin is null or btrim(p_metin) = '' then return null; end if;
  diller := coalesce(p_diller, public.uygunsuz_diller(p_metin));
  n := public.uygunsuz_normal(left(p_metin, 20000));
  for k in select normal from public.uygunsuz_istisnalar loop
    n := replace(n, ' ' || k.normal || ' ', ' ');
  end loop;
  s := replace(n, ' ', '');
  for k in
    select kelime, normal, eslesme from public.uygunsuz_kelimeler
    where (p_seviye = 'hepsi' or seviye = 'engel') and (dil = '*' or dil = any(diller))
    order by seviye, length(normal) desc
  loop
    if (k.eslesme = 'kelime' and position(' ' || k.normal || ' ' in n) > 0)
       or (k.eslesme = 'kok' and position(' ' || k.normal in n) > 0)
       or (k.eslesme = 'kok' and length(k.normal) >= 6 and position(k.normal in s) > 0) then
      return k.kelime;
    end if;
  end loop;
  return null;
end
$fn$;

-- Toplu tarama (içe aktarma kartları, onay kuyruğu): her metin için bulunan ifade ya da NULL, aynı sırayla.
create or replace function public.uygunsuz_tara(p_metinler text[])
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then return null; end if;
  if coalesce(array_length(p_metinler, 1), 0) > 500 then
    raise exception 'en çok 500 metin' using errcode = '22023';
  end if;
  return (select coalesce(array_agg(public.uygunsuz_bul(m, 'hepsi') order by i), '{}')
          from unnest(p_metinler) with ordinality as u(m, i));
end
$fn$;

revoke execute on function public.uygunsuz_diller(text) from public, anon;
revoke execute on function public.uygunsuz_bul(text, text, text[]) from public, anon;
revoke execute on function public.uygunsuz_tara(text[]) from public, anon;
grant execute on function public.uygunsuz_diller(text) to authenticated;
grant execute on function public.uygunsuz_bul(text, text, text[]) to authenticated;
grant execute on function public.uygunsuz_tara(text[]) to authenticated;

create or replace function public.uygunsuz_denetle()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  metin text;
  bulunan text;
begin
  if auth.uid() is null then return new; end if;                          -- SQL Editor / service_role / kayıt tetikleyicisi
  if public.is_editor_or_admin() or public.is_app_admin() then return new; end if;

  if tg_table_name = 'repertoires' then
    if coalesce(new.visibility, 'private') = 'private' and not coalesce(new.is_public, false) then return new; end if;
    if tg_op = 'UPDATE'
       and (old.name, old.venue, old.notes) is not distinct from (new.name, new.venue, new.notes)
       and (coalesce(old.visibility, 'private') <> 'private' or coalesce(old.is_public, false)) then
      return new;                                                          -- zaten paylaşılan, metin değişmedi
    end if;
    metin := concat_ws(' | ', new.name, new.venue, new.notes);
  elsif tg_table_name = 'repertoire_items' then
    if new.note is null or (tg_op = 'UPDATE' and old.note is not distinct from new.note) then return new; end if;
    if not exists (select 1 from public.repertoires r where r.id = new.repertoire_id
                   and (coalesce(r.visibility, 'private') <> 'private' or coalesce(r.is_public, false))) then
      return new;
    end if;
    metin := new.note;
  elsif tg_table_name = 'groups' then
    if tg_op = 'UPDATE' and (old.name, old.description) is not distinct from (new.name, new.description) then return new; end if;
    metin := concat_ws(' | ', new.name, new.description);
  elsif tg_table_name = 'profiles' then
    if tg_op = 'UPDATE' and (old.display_name, old.full_name) is not distinct from (new.display_name, new.full_name) then return new; end if;
    metin := concat_ws(' | ', new.display_name, new.full_name);
  elsif tg_table_name = 'solistler' then
    if tg_op = 'UPDATE' and (old.name, old.notes) is not distinct from (new.name, new.notes) then return new; end if;
    metin := concat_ws(' | ', new.name, new.notes);
  else
    return new;
  end if;

  bulunan := public.uygunsuz_bul(metin, 'engel');
  if bulunan is not null then
    raise exception 'Uygun olmayan ifade: "%". Başkalarının gördüğü ad ve açıklamalarda kullanılamaz.', bulunan
      using errcode = 'P0001', detail = bulunan, hint = 'uygunsuz_icerik';
  end if;
  return new;
end
$fn$;

drop trigger if exists trg_uygunsuz_denetle on public.repertoires;
create trigger trg_uygunsuz_denetle before insert or update of name, venue, notes, visibility, is_public
  on public.repertoires for each row execute function public.uygunsuz_denetle();
drop trigger if exists trg_uygunsuz_denetle on public.repertoire_items;
create trigger trg_uygunsuz_denetle before insert or update of note
  on public.repertoire_items for each row execute function public.uygunsuz_denetle();
drop trigger if exists trg_uygunsuz_denetle on public.groups;
create trigger trg_uygunsuz_denetle before insert or update of name, description
  on public.groups for each row execute function public.uygunsuz_denetle();
drop trigger if exists trg_uygunsuz_denetle on public.profiles;
create trigger trg_uygunsuz_denetle before insert or update of display_name, full_name
  on public.profiles for each row execute function public.uygunsuz_denetle();
drop trigger if exists trg_uygunsuz_denetle on public.solistler;
create trigger trg_uygunsuz_denetle before insert or update of name, notes
  on public.solistler for each row execute function public.uygunsuz_denetle();

-- ============================================================ DOĞRULAMA (salt okuma)
-- select has_table_privilege('anon', 'public.works', 'select') as anon_works;           -- false beklenir
-- select count(*), count(*) filter (where seviye = 'engel') from public.uygunsuz_kelimeler;
-- select public.uygunsuz_bul('S1kt1r git', 'engel'), public.uygunsuz_bul('Sıkıntı', 'hepsi'),
--        public.uygunsuz_bul('Kahpe felek', 'engel'), public.uygunsuz_bul('Kahpe felek', 'hepsi'),   -- siktir, NULL, NULL, kahpe
--        public.uygunsuz_bul('Siker és boldogság', 'hepsi', array['hu']),                             -- NULL (Macarca "başarı")
--        public.uygunsuz_bul('Konzert für Fagott', 'hepsi', array['de']);                             -- NULL (çalgı)

-- ============================================================ GERİ AL
-- grant select on table public.works to anon;
-- grant execute on function public.purge_deleted_works() to anon, authenticated;
-- drop trigger if exists trg_uygunsuz_denetle on public.repertoires;  (… repertoire_items, groups, profiles, solistler)
-- drop function if exists public.uygunsuz_denetle(), public.uygunsuz_tara(text[]), public.uygunsuz_bul(text, text, text[]),
--   public.uygunsuz_diller(text);
-- drop table if exists public.uygunsuz_kelimeler, public.uygunsuz_istisnalar; drop function if exists public.uygunsuz_normal(text);
