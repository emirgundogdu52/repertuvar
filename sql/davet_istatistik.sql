-- DAVET İSTATİSTİĞİ (2026-10-25)
--
-- Kullanıcı: "Yönetim / Son Hareket altında Aktif Davet bağlantısı var. Kaç kişi buradan davete icabet etti, kaç kişi vazgeçti
-- ya da kullanmadı bunları da görsek iyi olur."
--
-- Ölçüm (2026-10-25): 24 grup davet bağlantısı · 13 kullanılmış (13 katılım) · 10 kullanılmadan süresi dolmuş · 1 aktif.
-- "Vazgeçti" bugüne dek KAYDEDİLMİYORDU (açık bir "reddet" düğmesi de yok). Tanım: bağlantıyı AÇTI (login.html davet
-- penceresi → invite_preview) ama 1 gün içinde KATILMADI ve zaten üye değil. Açılış kaydı bu dosyayla başlar; geçmiş için yok.
--
--  · davet_olay: 'acildi' (invite_preview) / 'katildi' (redeem_invite başarılı). Yalnız yönetici okur.
--  · invite_preview / redeem_invite: mantık AYNEN; yalnız bir kayıt satırı eklendi, hata verse bile akış bozulmaz.
--  · davet_istatistik(): yönetici RPC — olusturulan, katilan, kullanilan_baglanti, bekleyen (süresi geçmemiş + kontenjanı
--    dolmamış; eski sayaç 'used_by is null' çok kullanımlık bağlantıyı ilk kullanımda pasif sayıyordu), kullanilmadan_dolan,
--    acilip_katilmayan, karar_bekleyen (açıldı, 1 günden az), takip_baslangic, son 30 gün kırılımı.
--  · İstemci: yonetim.html › Son Hareket.

create table if not exists public.davet_olay (
  id        bigserial primary key,
  invite_id uuid references public.group_invites(id) on delete cascade,
  olay      text not null check (olay in ('acildi', 'katildi')),
  user_id   uuid references auth.users(id) on delete set null,
  ts        timestamptz not null default now()
);
create index if not exists davet_olay_invite_idx on public.davet_olay (invite_id);
alter table public.davet_olay enable row level security;
drop policy if exists davet_olay_yonetici on public.davet_olay;
create policy davet_olay_yonetici on public.davet_olay for select to authenticated
  using (public.is_app_admin() or public.is_editor_or_admin());
revoke all on table public.davet_olay from anon;

create or replace function public.invite_preview(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare inv public.group_invites%rowtype; g public.groups%rowtype; uid uuid := auth.uid();
begin
  select * into inv from public.group_invites where token = p_token;
  if not found then return jsonb_build_object('ok',false,'reason','notfound'); end if;
  -- (2026-10-25) davet istatistiği: açılış kaydı (hata akışı bozmaz)
  begin
    insert into public.davet_olay (invite_id, olay, user_id) values (inv.id, 'acildi', uid);
  exception when others then null;
  end;
  select * into g from public.groups where id = inv.group_id;
  return jsonb_build_object(
    'ok', true,
    'group_name', coalesce(g.name,'Grup'),
    'used', inv.used_count >= inv.max_uses,
    'max_uses', inv.max_uses,
    'used_count', inv.used_count,
    'remaining', greatest(inv.max_uses - inv.used_count, 0),
    'expired', inv.expires_at is null or inv.expires_at < now(),
    'already_member', uid is not null and exists (
      select 1 from public.group_members gm
      where gm.group_id = inv.group_id and gm.user_id = uid)
  );
end;
$function$;

create or replace function public.redeem_invite(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare inv public.group_invites%rowtype; v_uid uuid := auth.uid(); v_claimed int;
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
$function$;

create or replace function public.davet_istatistik()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  takip timestamptz;
  acanlar int;
  vazgecen int;
  bekleyen_karar int;
begin
  if not (public.is_app_admin() or public.is_editor_or_admin()) then
    raise exception 'yetki yok' using errcode = '42501';
  end if;
  select min(ts) into takip from public.davet_olay;
  -- Açan kişi (davet + kişi başına bir), zaten üye olanlar ve katılanlar ayrılır
  with acilis as (
    select o.invite_id, o.user_id, min(o.ts) as ilk
    from public.davet_olay o where o.olay = 'acildi' and o.user_id is not null
    group by o.invite_id, o.user_id
  ), durum as (
    select a.*,
      exists (select 1 from public.davet_olay k where k.invite_id = a.invite_id and k.user_id = a.user_id and k.olay = 'katildi') as katildi,
      exists (select 1 from public.group_invites gi join public.group_members gm on gm.group_id = gi.group_id
              where gi.id = a.invite_id and gm.user_id = a.user_id) as uye
    from acilis a
  )
  select count(*),
         count(*) filter (where not katildi and not uye and ilk < now() - interval '1 day'),
         count(*) filter (where not katildi and not uye and ilk >= now() - interval '1 day')
    into acanlar, vazgecen, bekleyen_karar
  from durum;

  return jsonb_build_object(
    'olusturulan',         (select count(*) from public.group_invites),
    'katilan',             (select coalesce(sum(used_count), 0) from public.group_invites),
    'kullanilan_baglanti', (select count(*) from public.group_invites where used_count > 0),
    'bekleyen',            (select count(*) from public.group_invites where expires_at >= now() and used_count < max_uses),
    'kullanilmadan_dolan', (select count(*) from public.group_invites where (expires_at is null or expires_at < now()) and used_count = 0),
    'acan_kisi',           acanlar,
    'acilip_katilmayan',   vazgecen,
    'karar_bekleyen',      bekleyen_karar,
    'takip_baslangic',     takip,
    'son30', jsonb_build_object(
      'olusturulan', (select count(*) from public.group_invites where created_at >= now() - interval '30 days'),
      'katilan',     (select coalesce(sum(used_count), 0) from public.group_invites where created_at >= now() - interval '30 days'),
      'kullanilmadan_dolan', (select count(*) from public.group_invites where created_at >= now() - interval '30 days'
                                and (expires_at is null or expires_at < now()) and used_count = 0))
  );
end
$fn$;
revoke execute on function public.davet_istatistik() from public, anon;
grant execute on function public.davet_istatistik() to authenticated;

-- DOĞRULAMA: select public.davet_istatistik();  (yönetici jetonuyla) — 2026-10-25: olusturulan 24, katilan 13, dolan 10, bekleyen 1
-- GERİ AL: invite_preview / redeem_invite'ı kayıt bloğu olmadan yeniden oluştur (bu dosyadaki gövdelerden iki begin…end bloğunu çıkar);
--   drop function public.davet_istatistik(); drop table public.davet_olay;
