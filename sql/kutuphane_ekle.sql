-- KÜTÜPHANEDEN EKLE (2026-10-29) — kullanıcı: "Kütüphaneden ekle … hemen başla".
-- public.akor_kutuphanesi (akorculuk.com, izinli; RLS: yalnız sahibi okur) tablosunda arama, önizleme ve kişisel esere aktarma.
-- Veri İÇERMEZ (uygulama deposu herkese açık). Tablonun kendisi gizli depoda: veri/sql/akorculuk/kutuphane_00_tablo.sql.
--
-- Fonksiyonlar (hepsi SECURITY DEFINER; tablo RLS'i değişmez, tabloya doğrudan erişim yine yalnız sahibinde):
--   kutuphane_ara(q)      → en fazla 30 sonuç: id, ad, sanatci, karar, dil, ilk_dize, bizde_eser_id
--                           (Türkçe harf duyarsız; ad + sanatçıda bütün kelimeler geçmeli; 2 harften kısa sorguda boş)
--   kutuphane_getir(id)   → önizleme: söz, akor (ChordPro), karar, sanatçı, kaynak adresi
--   kutuphane_aktar(id)   → çağıranın KİŞİSEL eseri (private, approved) olarak works'e ekler, eser id'sini döndürür;
--                           aynı kişi aynı şarkıyı (aynı ad + aynı söz) ikinci kez aktarırsa mevcut eserin id'si döner
-- ERİŞİM: şimdilik yalnız editör / yönetici (is_editor_or_admin). HERKESE AÇMAK İÇİN üç fonksiyondaki
--   "public.is_editor_or_admin()" koşulunu "auth.uid() is not null" yap (arayüzde de eserler.html _kbYetkili()).
-- Özellik kullanımı: ozellik_kullanim'a 'kutuphane' türü eklenir (aktarma başına bir satır; içerik / şarkı adı yok).

begin;

-- Türkçe harf duyarsız arama anahtarı: İ/I/ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c, â/î/û düz; harf/rakam dışı her şey boşluk
create or replace function public.kutuphane_norm(t text)
returns text language sql immutable parallel safe set search_path = public as $$
  select regexp_replace(lower(translate(coalesce(t, ''), 'İIıŞşĞğÜüÖöÇçÂâÎîÛû', 'iiissgguuooccaaiiuu')), '[^a-z0-9]+', ' ', 'g')
$$;

create or replace function public.kutuphane_ara(q text)
returns table (id bigint, ad text, sanatci text, karar text, dil text, ilk_dize text, bizde_eser_id bigint)
language sql stable security definer set search_path = public as $$
  with s as (
    select array(select '%' || w || '%' from unnest(string_to_array(trim(public.kutuphane_norm(q)), ' ')) w where w <> '') as desen,
           trim(public.kutuphane_norm(q)) as tam
  )
  select k.id, k.ad, k.sanatci, k.karar, k.dil,
         left(substring(coalesce(k.soz, '') from '([^\n]*\S[^\n]*)'), 90) as ilk_dize,
         k.eser_id
    from public.akor_kutuphanesi k, s
   where public.is_editor_or_admin()
     and length(replace(s.tam, ' ', '')) >= 2
     and public.kutuphane_norm(k.ad || ' ' || coalesce(k.sanatci, '')) like all (s.desen)
   order by (trim(public.kutuphane_norm(k.ad)) like s.tam || '%') desc, length(k.ad), k.ad, k.id
   limit 30
$$;

create or replace function public.kutuphane_getir(p_id bigint)
returns table (id bigint, ad text, sanatci text, soz text, akor text, karar text, dil text, kaynak_url text, bizde_eser_id bigint)
language sql stable security definer set search_path = public as $$
  select k.id, k.ad, k.sanatci, k.soz, k.akor, k.karar, k.dil, k.kaynak_url, k.eser_id
    from public.akor_kutuphanesi k
   where k.id = p_id and public.is_editor_or_admin()
$$;

-- Özellik kullanımına yeni tür
alter table public.ozellik_kullanim drop constraint if exists ozellik_kullanim_ozellik_check;
alter table public.ozellik_kullanim add constraint ozellik_kullanim_ozellik_check
  check (ozellik = any (array['defter', 'ice_aktar', 'liste_doldur', 'verilerim_indir', 'kutuphane']));

create or replace function public.kutuphane_aktar(p_id bigint)
returns bigint language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  k public.akor_kutuphanesi%rowtype;
  eposta text;
  yeni bigint;
begin
  if uid is null or not public.is_editor_or_admin() then
    raise exception 'kutuphane: yetki yok' using errcode = '42501';
  end if;
  select * into k from public.akor_kutuphanesi where akor_kutuphanesi.id = p_id;
  if not found then raise exception 'kutuphane: şarkı bulunamadı' using errcode = 'P0002'; end if;

  -- Aynı kişi aynı şarkıyı daha önce aktardıysa kopya açma
  select w.id into yeni from public.works w
   where w.submitted_by = uid and w.deleted_at is null and w.name = k.ad and coalesce(w.lyrics, '') = coalesce(k.soz, '')
   order by w.id limit 1;
  if yeni is not null then return yeni; end if;

  select u.email into eposta from auth.users u where u.id = uid;
  -- Tür boş kalır (kütüphanede tür bilgisi yok; kullanıcı düzenlerken seçer). Sanatçı besteci sayılmaz, yazılmaz.
  insert into public.works (name, lyrics, chords, closing_note, dil, tur, visibility, status, group_id,
                            submitted_by, submitter_email, submitted_at)
  values (k.ad, k.soz, nullif(k.akor, ''), nullif(k.karar, ''), coalesce(nullif(k.dil, ''), 'tr'), null, 'private', 'approved', null,
          uid, coalesce(eposta, ''), now())
  returning works.id into yeni;

  begin
    insert into public.ozellik_kullanim (user_id, ozellik, yontem, adet) values (uid, 'kutuphane', 'aktar', 1);
  exception when others then null;   -- ölçüm aktarmayı asla bozmasın
  end;
  return yeni;
end $$;

revoke all on function public.kutuphane_norm(text) from public, anon;
revoke all on function public.kutuphane_ara(text) from public, anon;
revoke all on function public.kutuphane_getir(bigint) from public, anon;
revoke all on function public.kutuphane_aktar(bigint) from public, anon;
grant execute on function public.kutuphane_norm(text) to authenticated;
grant execute on function public.kutuphane_ara(text) to authenticated;
grant execute on function public.kutuphane_getir(bigint) to authenticated;
grant execute on function public.kutuphane_aktar(bigint) to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- DOĞRULAMA (öneri; sonda hata fırlatıp HER ŞEYİ geri alır). <YÖNETİCİ_UID> ve <ÜYE_UID> yerine gerçek kimlikleri yaz.
-- do $t$
-- declare n int; yeni bigint; ikinci bigint;
-- begin
--   perform set_config('request.jwt.claims', json_build_object('sub', '<YÖNETİCİ_UID>', 'role', 'authenticated')::text, true);
--   select count(*) into n from public.kutuphane_ara('kizilciklar');            if n = 0 then raise exception 'arama boş'; end if;
--   select count(*) into n from public.kutuphane_ara('K');                      if n <> 0 then raise exception 'kısa sorgu'; end if;
--   select count(*) into n from public.kutuphane_ara('barış manço');            if n = 0 then raise exception 'sanatçı araması'; end if;
--   select public.kutuphane_aktar((select id from public.akor_kutuphanesi order by id limit 1)) into yeni;
--   select public.kutuphane_aktar((select id from public.akor_kutuphanesi order by id limit 1)) into ikinci;
--   if yeni <> ikinci then raise exception 'kopya açıldı'; end if;
--   if (select visibility from public.works where id = yeni) <> 'private' then raise exception 'kişisel değil'; end if;
--   perform set_config('request.jwt.claims', json_build_object('sub', '<ÜYE_UID>', 'role', 'authenticated')::text, true);
--   select count(*) into n from public.kutuphane_ara('kizilciklar');            if n <> 0 then raise exception 'üye görmemeli'; end if;
--   raise exception 'DOĞRULAMA TAMAM (geri alındı)';
-- end $t$;

-- GERİ ALMA:
-- drop function if exists public.kutuphane_aktar(bigint);
-- drop function if exists public.kutuphane_getir(bigint);
-- drop function if exists public.kutuphane_ara(text);
-- drop function if exists public.kutuphane_norm(text);
-- delete from public.ozellik_kullanim where ozellik = 'kutuphane';
-- alter table public.ozellik_kullanim drop constraint if exists ozellik_kullanim_ozellik_check;
-- alter table public.ozellik_kullanim add constraint ozellik_kullanim_ozellik_check
--   check (ozellik = any (array['defter', 'ice_aktar', 'liste_doldur', 'verilerim_indir']));
