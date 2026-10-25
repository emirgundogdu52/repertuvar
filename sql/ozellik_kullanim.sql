-- ÖZELLİK KULLANIMI TAKİBİ (2026-10-25)
--
-- Kullanıcı: "Tarama ve dosyadan içe aktarma gibi özellikler için bir raporlama / takip sistemi kuralım. Kaç kişi defterden kaç
-- eser aktarıyor, en çok hangi yöntem tercih ediliyor."
--
-- Bugüne dek yalnız defter_okuma_kayit vardı (yapay zekâ ile okunan sayfa; 5 kayıt, 22–23 Ekim denemeleri). Kaç eser oluştuğu,
-- sayfanın hangi yolla geldiği (cihaz tarayıcısı / dosya / PDF), içe aktarma ve liste doldurma hiç kaydedilmiyordu.
--
--  · ozellik_kullanim: istemci her BAŞARILI işlemden sonra bir satır yazar (yöntem başına ayrı satır). İçerik / şarkı adı YOK —
--    yalnız özellik, yöntem, adet, platform, küçük sayısal ayrıntı. Kullanıcı yalnız KENDİ satırını ekleyebilir; okuma yönetici.
--      ozellik: 'defter' (Defterden ekle; yöntem tarayici | dosya | pdf; adet = sayfa; ayrinti {yeni_eser, nota_eklenen})
--               'ice_aktar' (Başka uygulamadan aktar; yöntem chordpro | onsong | word | txt | zip | yapistir; adet = eser)
--               'liste_doldur' (Şarkı listesinden doldur; yöntem yapistir | xlsx | docx | csv | txt | ods | odt; adet = eklenen;
--                               ayrinti {eslesen, yeni_eser, satir})
--               'verilerim_indir' (adet = kendi eser sayısı)
--      platform: ios | android | web-masaustu | web-mobil
--  · ozellik_istatistik(p_gun): yönetici RPC — özellik başına kişi, olay, toplam adet, yöntem dağılımı (kişi + adet) + defter
--    okuma (defter_okuma_kayit) + takip başlangıcı. İstemci: yonetim.html › Özellik Kullanımı.
--
-- Geri alma en altta.

create table if not exists public.ozellik_kullanim (
  id         bigserial primary key,
  user_id    uuid default auth.uid() references auth.users(id) on delete set null,
  ozellik    text not null check (ozellik in ('defter', 'ice_aktar', 'liste_doldur', 'verilerim_indir')),
  yontem     text check (char_length(yontem) <= 40),
  adet       int not null default 1 check (adet between 0 and 10000),
  platform   text check (char_length(platform) <= 20),
  ayrinti    jsonb check (ayrinti is null or pg_column_size(ayrinti) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists ozellik_kullanim_ozellik_tarih on public.ozellik_kullanim (ozellik, created_at);
alter table public.ozellik_kullanim enable row level security;
drop policy if exists ozellik_kullanim_ekle on public.ozellik_kullanim;
create policy ozellik_kullanim_ekle on public.ozellik_kullanim for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists ozellik_kullanim_yonetici on public.ozellik_kullanim;
create policy ozellik_kullanim_yonetici on public.ozellik_kullanim for select to authenticated
  using (public.is_app_admin() or public.is_editor_or_admin());
revoke all on table public.ozellik_kullanim from anon;
grant insert on table public.ozellik_kullanim to authenticated;
grant usage, select on sequence public.ozellik_kullanim_id_seq to authenticated;

create or replace function public.ozellik_istatistik(p_gun int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  bas timestamptz := now() - make_interval(days => greatest(coalesce(p_gun, 30), 1));
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'gun', p_gun,
    'takip_baslangic', (select min(created_at) from public.ozellik_kullanim),
    'ozellikler', coalesce((
      select jsonb_object_agg(o.ozellik, jsonb_build_object(
        'kisi', o.kisi, 'olay', o.olay, 'adet', o.adet,
        'yeni_eser', o.yeni_eser, 'nota_eklenen', o.nota_eklenen,
        'yontemler', (select coalesce(jsonb_agg(jsonb_build_object('yontem', y.yontem, 'kisi', y.kisi, 'adet', y.adet) order by y.adet desc), '[]'::jsonb)
                      from (select coalesce(k.yontem, '?') as yontem, count(distinct k.user_id) as kisi, sum(k.adet) as adet
                            from public.ozellik_kullanim k where k.ozellik = o.ozellik and k.created_at >= bas
                            group by 1) y)))
      from (select ozellik, count(distinct user_id) as kisi, count(*) as olay, sum(adet) as adet,
                   sum(coalesce((ayrinti->>'yeni_eser')::int, 0)) as yeni_eser,
                   sum(coalesce((ayrinti->>'nota_eklenen')::int, 0)) as nota_eklenen
            from public.ozellik_kullanim where created_at >= bas group by ozellik) o), '{}'::jsonb),
    'platformlar', coalesce((select jsonb_object_agg(coalesce(platform, '?'), n)
                             from (select platform, count(*) as n from public.ozellik_kullanim where created_at >= bas group by 1) p), '{}'::jsonb),
    'defter_okuma', (select jsonb_build_object('kisi', count(distinct user_id), 'sayfa', coalesce(sum(sayfa), 0), 'kayit', count(*))
                     from public.defter_okuma_kayit where created_at >= bas)
  );
end
$fn$;
revoke execute on function public.ozellik_istatistik(int) from public, anon;
grant execute on function public.ozellik_istatistik(int) to authenticated;

-- DOĞRULAMA: select public.ozellik_istatistik(30);  (yönetici jetonuyla)
-- GERİ AL: drop function if exists public.ozellik_istatistik(int); drop table if exists public.ozellik_kullanim;
