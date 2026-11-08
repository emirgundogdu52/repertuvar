-- 2026-11-08 — Grup/Koro ve Edu koltuklu lisans (Emir kararları 08.11; UYGULANMADI — Emir "çalıştır" diyecek).
--
-- Kurallar:
--  * Lisans gruba aittir (Paddle aboneliği; webhook `paddle-webhook` service role ile `grup_lisans_yaz` çağırır).
--  * Grup/Koro (plan 'pro'): gruptaki TÜM etkin üyeler koltuk sayar (yönetici dahil).
--  * Edu (plan 'edu'): her 20 koltuğa 1 öğretmen ücretsiz (Emir 08.11): ücretsiz öğretmen sayısı = en az 1, koltuk/20 yukarı
--    yuvarlanır. Öğretmen = yönetici rolü (önce kurucu, sonra katılım sırası); kotayı aşan yöneticiler koltuk sayar.
--  * Koltuklar katılım sırasıyla dolar (joined_at, eşitlikte id). Koltuk sayısı düşerse SON katılanlar lisanstan
--    yararlanamaz (gruptan çıkarılmaz). Ayrılanın koltuğu kendiliğinden boşalır.
--  * Koltuk doluysa davetle yeni üye katılamaz: redeem_invite → {ok:false, reason:'koltuk-dolu'}.
--  * Lisans geçerli: durum in ('aktif','iptal_edildi','odeme_sorunu') ve (bitis null ya da > now()). Bitince Pro düşer (cron yok).
--  * Edu yalnız uygulama yöneticisinin onayladığı grupta satın alınabilir (edu_onaylari; webhook onaysız Edu'yu yazmaz).
--  * plan_of sırası: kişisel abonelik (mağaza/web/hediye) → grup lisansı → eski profiles.plan → 'free'. Kişisel Pro aynen kalır.

create table if not exists public.grup_lisanslari (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  plan         text not null check (plan in ('pro','edu')),
  koltuk       int  not null check (koltuk > 0),
  durum        text not null check (durum in ('aktif','iptal_edildi','odeme_sorunu','askida','suresi_doldu')),
  baslangic    timestamptz,
  bitis        timestamptz,
  kaynak       text not null default 'paddle' check (kaynak in ('paddle','elle')),
  dis_kimlik   text not null,                       -- Paddle abonelik kimliği (sub_…)
  alan_kullanici uuid references auth.users(id) on delete set null,
  ortam        text not null default 'production' check (ortam in ('production','sandbox')),
  son_olay     timestamptz,                         -- sıra dışı gelen eski webhook olayını yok saymak için
  ham          jsonb,
  olusturuldu  timestamptz not null default now(),
  guncellendi  timestamptz not null default now(),
  unique (kaynak, dis_kimlik)
);
create index if not exists grup_lisanslari_group_idx on public.grup_lisanslari (group_id);

create table if not exists public.edu_onaylari (
  group_id    uuid primary key references public.groups(id) on delete cascade,
  onaylayan   uuid references auth.users(id) on delete set null,
  onaylandi   timestamptz not null default now()
);

alter table public.grup_lisanslari enable row level security;
alter table public.edu_onaylari   enable row level security;
drop policy if exists grup_lisanslari_okur on public.grup_lisanslari;
create policy grup_lisanslari_okur on public.grup_lisanslari for select
  using (public.is_group_manager(group_id) or public.is_app_admin());
drop policy if exists edu_onaylari_okur on public.edu_onaylari;
create policy edu_onaylari_okur on public.edu_onaylari for select
  using (public.is_group_manager(group_id) or public.is_app_admin());
-- Yazma yalnız service role (webhook) ve aşağıdaki SECURITY DEFINER fonksiyonlarla.
revoke insert, update, delete on public.grup_lisanslari from anon, authenticated;
revoke insert, update, delete on public.edu_onaylari   from anon, authenticated;
revoke select on public.grup_lisanslari from anon;
revoke select on public.edu_onaylari   from anon;
grant select on public.grup_lisanslari to authenticated;
grant select on public.edu_onaylari   to authenticated;

-- Edu'da ücretsiz öğretmen kotası: her 20 koltuğa 1 (en az 1).
create or replace function public.edu_ucretsiz_ogretmen(p_koltuk int)
returns int language sql immutable set search_path = public, pg_temp as $$ select greatest(1, ceil(p_koltuk / 20.0))::int $$;

-- Kişinin grup lisansından gelen planı (koltuğu içindeyse). En iyi plan (pro > edu) tek satır.
create or replace function public.lisans_plani(uid uuid)
returns table (plan text, group_id uuid, bitis timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with l as (
    select gl.group_id, gl.plan, gl.koltuk, gl.bitis
      from public.grup_lisanslari gl
     where gl.durum in ('aktif','iptal_edildi','odeme_sorunu')
       and (gl.bitis is null or gl.bitis > now())
       and gl.group_id in (select gm.group_id from public.group_members gm
                            where gm.user_id = uid and coalesce(gm.status,'active') = 'active')),
  m0 as (
    select gm.group_id, gm.user_id, gm.joined_at, gm.id, (gm.role in ('owner','admin')) as yonetici,
           row_number() over (partition by gm.group_id, (gm.role in ('owner','admin'))
                              order by (gm.role = 'owner') desc, gm.joined_at nulls first, gm.id) as yon_sira
      from public.group_members gm
     where gm.group_id in (select l.group_id from l) and coalesce(gm.status,'active') = 'active'),
  m as (
    select m0.*, l.plan, l.koltuk, l.bitis,
           (l.plan = 'edu' and m0.yonetici and m0.yon_sira <= public.edu_ucretsiz_ogretmen(l.koltuk)) as ucretsiz
      from m0 join l on l.group_id = m0.group_id),
  s as (
    select m.*, row_number() over (partition by m.group_id, m.plan, m.ucretsiz
                                   order by m.joined_at nulls first, m.id) as koltuk_sira
      from m)
  select s.plan, s.group_id, s.bitis
    from s
   where s.user_id = uid and (s.ucretsiz or s.koltuk_sira <= s.koltuk)
   order by case s.plan when 'pro' then 1 else 2 end, s.bitis desc nulls first
   limit 1;
$$;
revoke all on function public.lisans_plani(uuid) from public, anon, authenticated;

create or replace function public.plan_of(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select a.plan from public.abonelikler a
      where a.user_id = uid
        and a.durum in ('deneme','aktif','iptal_edildi','odeme_sorunu')
        and (a.bitis is null or a.bitis > now())
      order by case a.plan when 'pro' then 1 else 2 end
      limit 1),
    -- (2026-11-08) Grup/Koro ya da Edu koltuk lisansı
    (select lp.plan from public.lisans_plani(uid) lp),
    -- GEÇİŞ (lansmanda kaldırılacak): eski profiles.plan yolu — bugünkü davranış
    (select case when p.plan is null then 'free' when p.plan = 'free' then 'free'
                 when p.plan_expires_at is null then p.plan when p.plan_expires_at > now() then p.plan else 'free' end
       from public.profiles p where p.id = uid),
    'free');
$$;

create or replace function public.abonelik_durumu()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with aktif as (
    select * from public.abonelikler
     where user_id = auth.uid()
       and durum in ('deneme','aktif','iptal_edildi','odeme_sorunu')
       and (bitis is null or bitis > now())
     order by bitis desc nulls first
     limit 1),
  son as (
    select * from public.abonelikler where user_id = auth.uid() order by guncellendi desc limit 1),
  lis as (
    select * from public.lisans_plani(auth.uid()))
  select jsonb_build_object(
    'plan',              public.plan_of(auth.uid()),
    'kaynak',            coalesce((select kaynak from aktif), (select 'grup'::text from lis)),
    'hediye',            coalesce((select kaynak = 'hediye' from aktif), false),
    'durum',             case when exists (select 1 from aktif) then (select durum from aktif)
                              when exists (select 1 from lis) then 'aktif'
                              else (select durum from son) end,
    'bitis',             case when exists (select 1 from aktif) then (select bitis from aktif)
                              when exists (select 1 from lis) then (select bitis from lis)
                              else (select bitis from son) end,
    'deneme',            coalesce((select deneme from aktif), false),
    'otomatik_yenileme', (select otomatik_yenileme from aktif),
    'urun_id',           (select urun_id from aktif),
    'grup_lisansi',      (select jsonb_build_object('group_id', group_id, 'plan', plan, 'bitis', bitis) from lis),
    'daha_once_pro',     exists (select 1 from public.abonelikler where user_id = auth.uid()),
    'deneme_kullanildi', exists (select 1 from public.abonelikler where user_id = auth.uid() and deneme),
    'zorunlu_web',       coalesce((select deger = 'true' from public.uygulama_ayarlari where anahtar = 'abonelik_zorunlu_web'), false)
  );
$$;

-- Davetle katılım: lisanslı grupta koltuk doluysa reddet (yalnız bu blok yeni; gerisi canlıdaki tanımla aynı).
create or replace function public.redeem_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare inv public.group_invites%rowtype; v_uid uuid := auth.uid(); v_claimed int;
        v_lis record; v_dolu int;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'reason','auth'); end if;
  select * into inv from public.group_invites where token = p_token;
  if not found then return jsonb_build_object('ok',false,'reason','notfound'); end if;

  -- Zaten üyeyse kontenjandan DÜŞME
  if exists (select 1 from public.group_members gm
             where gm.group_id = inv.group_id and gm.user_id = v_uid) then
    return jsonb_build_object('ok',true,'already_member',true,'group_id',inv.group_id);
  end if;

  if inv.expires_at is null or inv.expires_at < now() then
    return jsonb_build_object('ok',false,'reason','expired');
  end if;

  -- (2026-11-08) Koltuklu lisans: koltuklar doluysa yeni üye katılamaz (Emir). Yeni üye 'member' rolüyle
  -- girer; Grup/Koro'da herkes, Edu'da ücretsiz öğretmen kotası dışındaki herkes koltuk sayar.
  select gl.plan, gl.koltuk into v_lis
    from public.grup_lisanslari gl
   where gl.group_id = inv.group_id
     and gl.durum in ('aktif','iptal_edildi','odeme_sorunu')
     and (gl.bitis is null or gl.bitis > now())
   order by gl.koltuk desc
   limit 1;
  if found then
    select count(*) - case when v_lis.plan = 'edu'
                           then least(count(*) filter (where gm.role in ('owner','admin')),
                                      public.edu_ucretsiz_ogretmen(v_lis.koltuk))
                           else 0 end
      into v_dolu from public.group_members gm
     where gm.group_id = inv.group_id and coalesce(gm.status,'active') = 'active';
    if v_dolu >= v_lis.koltuk then
      return jsonb_build_object('ok',false,'reason','koltuk-dolu');
    end if;
  end if;

  -- Kontrol ve artırma TEK ifadede: eşzamanlı okutmalarda kontenjan aşılamaz
  update public.group_invites gi
     set used_count = gi.used_count + 1,
         used_by    = coalesce(gi.used_by, v_uid),
         used_at    = coalesce(gi.used_at, now())
   where gi.id = inv.id
     and gi.used_count < gi.max_uses;
  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then return jsonb_build_object('ok',false,'reason','full'); end if;

  insert into public.group_members (group_id, user_id, role, status)
  values (inv.group_id, v_uid, 'member', 'active') on conflict do nothing;
  update public.profiles p set group_id = inv.group_id
   where p.id = v_uid and p.group_id is null;

  -- (2026-10-25) davet istatistiği: katılım kaydı (hata akışı bozmaz)
  begin
    insert into public.davet_olay (invite_id, olay, user_id) values (inv.id, 'katildi', v_uid);
  exception when others then null;
  end;

  return jsonb_build_object('ok', true, 'group_id', inv.group_id);
end;
$$;

-- Grup yöneticisine (ve uygulama yöneticisine) lisans ve koltuk kullanımı.
create or replace function public.grup_lisans_durumu(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_lis record; v_dolu int := 0; v_var boolean;
begin
  if not (public.is_group_manager(p_group_id) or public.is_app_admin()) then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;
  select gl.plan, gl.koltuk, gl.durum, gl.bitis into v_lis
    from public.grup_lisanslari gl
   where gl.group_id = p_group_id
     and gl.durum in ('aktif','iptal_edildi','odeme_sorunu')
     and (gl.bitis is null or gl.bitis > now())
   order by gl.koltuk desc
   limit 1;
  v_var := found;
  if v_var then
    select count(*) - case when v_lis.plan = 'edu'
                           then least(count(*) filter (where gm.role in ('owner','admin')),
                                      public.edu_ucretsiz_ogretmen(v_lis.koltuk))
                           else 0 end
      into v_dolu from public.group_members gm
     where gm.group_id = p_group_id and coalesce(gm.status,'active') = 'active';
  end if;
  return jsonb_build_object(
    'lisans', case when v_var then jsonb_build_object('plan', v_lis.plan, 'koltuk', v_lis.koltuk,
                                                      'durum', v_lis.durum, 'bitis', v_lis.bitis) end,
    'dolu', v_dolu,
    'edu_onayli', exists (select 1 from public.edu_onaylari e where e.group_id = p_group_id));
end;
$$;

-- Uygulama yöneticisi: Edu onayı ver/kaldır ve grup ara (Yönetim).
create or replace function public.edu_onay_ver(p_group_id uuid, p_onay boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_app_admin() then
    raise exception 'yetki-yok' using errcode = '42501';
  end if;
  if p_onay then
    insert into public.edu_onaylari (group_id, onaylayan) values (p_group_id, auth.uid())
    on conflict (group_id) do nothing;
  else
    delete from public.edu_onaylari where group_id = p_group_id;
  end if;
  return p_onay;
end;
$$;

create or replace function public.edu_grup_ara(p_ara text)
returns table (group_id uuid, ad text, kurucu_eposta text, uye int, edu_onayli boolean)
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
    select g.id, g.name, u.email::text,
           (select count(*)::int from public.group_members gm where gm.group_id = g.id and coalesce(gm.status,'active') = 'active'),
           exists (select 1 from public.edu_onaylari e where e.group_id = g.id)
      from public.groups g
      left join auth.users u on u.id = g.owner_id
     where length(trim(coalesce(p_ara, ''))) >= 2
       and (g.name ilike '%' || trim(p_ara) || '%' or u.email ilike '%' || trim(p_ara) || '%')
     order by g.name
     limit 20;
end;
$$;

-- Webhook (service role) yazar: tek abonelik = tek satır; eski olay yeniyi ezmez.
-- Dönüş: 'yazildi' | 'eski-olay' | 'yonetici-degil' | 'edu-onaysiz'
create or replace function public.grup_lisans_yaz(
  p_dis_kimlik text, p_group_id uuid, p_user_id uuid, p_plan text, p_koltuk int, p_durum text,
  p_baslangic timestamptz, p_bitis timestamptz, p_ortam text, p_olay timestamptz, p_ham jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_son timestamptz; v_var boolean;
begin
  select son_olay, true into v_son, v_var from public.grup_lisanslari where kaynak = 'paddle' and dis_kimlik = p_dis_kimlik;
  if coalesce(v_var, false) and v_son is not null and p_olay is not null and p_olay < v_son then
    return 'eski-olay';
  end if;
  -- İlk kayıtta alan kişi o grubun yöneticisi olmalı; Edu yalnız onaylı grupta.
  if not coalesce(v_var, false) then
    if not exists (select 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id
                    and gm.role in ('owner','admin') and coalesce(gm.status,'active') = 'active') then
      return 'yonetici-degil';
    end if;
    if p_plan = 'edu' and not exists (select 1 from public.edu_onaylari e where e.group_id = p_group_id) then
      return 'edu-onaysiz';
    end if;
  end if;
  insert into public.grup_lisanslari (group_id, plan, koltuk, durum, baslangic, bitis, kaynak, dis_kimlik,
                                      alan_kullanici, ortam, son_olay, ham)
  values (p_group_id, p_plan, p_koltuk, p_durum, p_baslangic, p_bitis, 'paddle', p_dis_kimlik,
          p_user_id, p_ortam, p_olay, p_ham)
  on conflict (kaynak, dis_kimlik) do update
     set plan = excluded.plan, koltuk = excluded.koltuk, durum = excluded.durum,
         baslangic = coalesce(grup_lisanslari.baslangic, excluded.baslangic), bitis = excluded.bitis,
         ortam = excluded.ortam, son_olay = excluded.son_olay, ham = excluded.ham, guncellendi = now();
  return 'yazildi';
end;
$$;

revoke all on function public.grup_lisans_durumu(uuid) from public, anon;
revoke all on function public.edu_onay_ver(uuid, boolean) from public, anon;
revoke all on function public.edu_grup_ara(text) from public, anon;
revoke all on function public.grup_lisans_yaz(text, uuid, uuid, text, int, text, timestamptz, timestamptz, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.grup_lisans_durumu(uuid) to authenticated;
grant execute on function public.edu_onay_ver(uuid, boolean) to authenticated;
grant execute on function public.edu_grup_ara(text) to authenticated;
grant execute on function public.grup_lisans_yaz(text, uuid, uuid, text, int, text, timestamptz, timestamptz, text, timestamptz, jsonb)
  to service_role;
