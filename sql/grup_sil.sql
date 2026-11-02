-- 2026-11-02 — Grup silme: tek onay, tek işlem, ya hep ya hiç.
-- Olay: deleteGroup() önce group_members'ı toplu sildi, sonra groups FK (repertoires/solistler/works/profiles)
-- yüzünden 409 aldı → grup kaldı, üyeler gitti (Ezgi Harmanı, TEST SEVİYESİ DENEME GRUBU).

-- 1) KORUMA: grup dururken SON kurucunun üyelik satırı silinemez. Eski istemci (1.0 (6) dahil) yine üyeleri
--    toplu silmeye kalkarsa bu satıra gelince istisna atılır, TÜM DELETE geri alınır, kimse düşmez.
--    Serbest: grup silinirken cascade, hesap silinirken cascade, başka kurucu varken silme.
create or replace function public.son_kurucu_korumasi()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if old.role is distinct from 'owner' then return old; end if;
  if not exists (select 1 from public.groups g where g.id = old.group_id) then return old; end if;
  if not exists (select 1 from auth.users u where u.id = old.user_id) then return old; end if;
  if exists (select 1 from public.group_members m
              where m.group_id = old.group_id and m.role = 'owner' and m.id <> old.id) then return old; end if;
  raise exception 'son_kurucu: grup dururken son kurucunun üyeliği silinemez (group_id=%)', old.group_id
    using errcode = 'P0001';
end; $$;

drop trigger if exists trg_son_kurucu_korumasi on public.group_members;
create trigger trg_son_kurucu_korumasi before delete on public.group_members
  for each row execute function public.son_kurucu_korumasi();

-- Yetki: çağıran bu grubun kurucusu mu (group_members.role='owner' ya da groups.owner_id)?
create or replace function public._grup_kurucusu_mu(p_group_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.group_members m
                  where m.group_id = p_group_id and m.user_id = auth.uid() and m.role = 'owner')
      or exists (select 1 from public.groups g where g.id = p_group_id and g.owner_id = auth.uid());
$$;

-- 2) ÖZET: onay penceresinde "neler silinecek" sayıları için. Hiçbir şeyi değiştirmez.
create or replace function public.grup_sil_ozet(p_group_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if not public._grup_kurucusu_mu(p_group_id) then
    raise exception 'yetki: yalnız grubun kurucusu silebilir' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'ad',         g.name,
    'uye',        (select count(*) from public.group_members  where group_id = g.id),
    'repertuvar', (select count(*) from public.repertoires    where group_id = g.id),
    'solist',     (select count(*) from public.solistler      where group_id = g.id),
    'eser',       (select count(*) from public.works          where group_id = g.id)
  ) into r from public.groups g where g.id = p_group_id;
  if r is null then raise exception 'grup bulunamadı' using errcode = 'P0002'; end if;
  return r;
end; $$;

-- 3) SİLME: tek transaction. Sıra: solistler → repertuvarlar (+ maddeleri/paylaşımları cascade)
--    → eser ve profillerden grup bağı (eserler SİLİNMEZ, sahibinde kalır) → grup (üyeler, davetler,
--    grup paylaşımları cascade; ritim/ses kayıtlarının grup bağı SET NULL). Bir adım düşerse hiçbiri olmaz.
create or replace function public.grup_sil(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare ozet jsonb;
begin
  ozet := public.grup_sil_ozet(p_group_id);   -- yetki + var mı kontrolü burada
  perform 1 from public.groups where id = p_group_id for update;
  delete from public.solistler   where group_id = p_group_id;
  delete from public.repertoires where group_id = p_group_id;
  update public.works    set group_id = null where group_id = p_group_id;
  update public.profiles set group_id = null where group_id = p_group_id;
  delete from public.groups where id = p_group_id;
  return ozet;
end; $$;

revoke all on function public.grup_sil_ozet(uuid) from public, anon;
revoke all on function public.grup_sil(uuid)      from public, anon;
revoke all on function public._grup_kurucusu_mu(uuid) from public, anon;
grant execute on function public.grup_sil_ozet(uuid) to authenticated;
grant execute on function public.grup_sil(uuid)      to authenticated;
grant execute on function public._grup_kurucusu_mu(uuid) to authenticated;
