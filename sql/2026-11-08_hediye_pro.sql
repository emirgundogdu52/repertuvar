-- 2026-11-08 — Hediye Pro, Yönetim'den (yalnız uygulama yöneticisi: is_app_admin()). Emir: süre yalnız 1 yıl.
--
-- Nasıl çalışır (plan_of / abonelik_durumu ile aynı kurallar):
--  * Pro sayılan satır: durum in ('deneme','aktif','iptal_edildi','odeme_sorunu') ve (bitis null ya da bitis > now()).
--    ⇒ 1 yıllık hediyenin süresi dolunca Pro KENDİLİĞİNDEN düşer; cron gerekmez (satır 'aktif' kalır, bitis geçmiştir).
--  * Kullanıcı başına tek hediye satırı: unique (kaynak, dis_kimlik), dis_kimlik = 'hediye:<uid>' (mevcut desen).
--  * Süresiz (bitis null) etkin hediyeye dokunulmaz; etkin süreli hediye 1 yıl uzatılır; bitmiş/geri alınmış satır yeniden açılır.
--  * Geri alma: durum 'suresi_doldu', bitis now(). Not: profiles.plan='pro' (eski geçiş yolu) olan hesapta Pro sürer.

create or replace function public.hediye_pro_ver(p_eposta text, p_aciklama text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid;
  v_eposta text;
  v_satir public.abonelikler%rowtype;
  v_bitis timestamptz;
  v_not   text := nullif(trim(coalesce(p_aciklama, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;

  select u.id, u.email::text into v_uid, v_eposta
    from auth.users u
   where lower(u.email) = lower(trim(coalesce(p_eposta, '')))
   limit 1;
  if v_uid is null then
    raise exception 'kullanici-yok' using errcode = 'P0002';
  end if;

  select * into v_satir
    from public.abonelikler
   where kaynak = 'hediye' and dis_kimlik = 'hediye:' || v_uid
   for update;

  if found and v_satir.durum = 'aktif' and v_satir.bitis is null then
    return jsonb_build_object('eposta', v_eposta, 'bitis', null, 'zaten_suresiz', true);
  end if;

  if found and v_satir.durum = 'aktif' and v_satir.bitis > now() then
    v_bitis := v_satir.bitis + interval '1 year';     -- süren hediye: üstüne 1 yıl
  else
    v_bitis := now() + interval '1 year';
  end if;

  insert into public.abonelikler
         (user_id, kaynak, plan, durum, deneme, otomatik_yenileme, ortam, dis_kimlik, baslangic, bitis, aciklama)
  values (v_uid, 'hediye', 'pro', 'aktif', false, false, 'production', 'hediye:' || v_uid, now(), v_bitis, v_not)
  on conflict (kaynak, dis_kimlik) do update
     set plan        = 'pro',
         durum       = 'aktif',
         baslangic   = case when abonelikler.durum = 'aktif' and abonelikler.bitis > now()
                            then abonelikler.baslangic else now() end,
         bitis       = excluded.bitis,
         aciklama    = coalesce(excluded.aciklama, abonelikler.aciklama),
         guncellendi = now();

  return jsonb_build_object('eposta', v_eposta, 'bitis', v_bitis, 'zaten_suresiz', false);
end;
$$;

create or replace function public.hediye_pro_geri_al(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_app_admin() then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;
  update public.abonelikler
     set durum = 'suresi_doldu', bitis = now(), guncellendi = now()
   where id = p_id and kaynak = 'hediye' and durum = 'aktif';
  return found;
end;
$$;

create or replace function public.hediye_pro_listesi()
returns table (id uuid, eposta text, ad text, baslangic timestamptz, bitis timestamptz, aciklama text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;
  return query
    select a.id, u.email::text, coalesce(nullif(p.full_name, ''), nullif(p.display_name, '')),
           a.baslangic, a.bitis, a.aciklama
      from public.abonelikler a
      join auth.users u on u.id = a.user_id
      left join public.profiles p on p.id = a.user_id
     where a.kaynak = 'hediye' and a.durum = 'aktif' and (a.bitis is null or a.bitis > now())
     order by a.bitis nulls first, a.baslangic desc nulls last;
end;
$$;

revoke all on function public.hediye_pro_ver(text, text) from public, anon;
revoke all on function public.hediye_pro_geri_al(uuid) from public, anon;
revoke all on function public.hediye_pro_listesi() from public, anon;
grant execute on function public.hediye_pro_ver(text, text) to authenticated;
grant execute on function public.hediye_pro_geri_al(uuid) to authenticated;
grant execute on function public.hediye_pro_listesi() to authenticated;
