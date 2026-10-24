-- 2026-10-24: Duyuru ve admin mesajı → zil bildirimi (notifications); üyenin okundu bilgisi ayrı alan.
-- Kullanıcı: "Evet, ikisi de bildirim göndersin, düzelt" (Toplu Duyuru + Yeni Mesaj).
-- Sebep: read_at hem "admin okudu" hem "üye okudu" için kullanılıyordu; admin konuşmayı açınca (ya da Yeni Mesaj'da
-- kayıt baştan read_at dolu yazıldığı için) üyenin okunmamış sayacı hiç artmıyordu. Duyurular hiç haber vermiyordu.
-- Yalnız EKLEME: yeni sütun + iki tetikleyici (mevcut notify_group_join / notify_admins_on_report düzeninde,
-- SECURITY DEFINER; hata duyuru/mesaj kaydını asla engellemez). İstemci (app/ topnav.js + mesajlar.html) bu sütuna
-- bağlı → YAYIN GÜNÜ'nden ÖNCE çalıştırılmalı.

alter table public.messages add column if not exists uye_okudu_at timestamptz;
comment on column public.messages.uye_okudu_at is 'Üyenin admin yanıtını okuduğu an (read_at = adminin üye mesajını okuduğu an). 2026-10-24.';
-- Mevcut yanıtlar okunmuş sayılır (yeni istemci yayınlanınca eski yanıtlar birden "okunmamış" görünmesin).
update public.messages set uye_okudu_at = coalesce(read_at, replied_at, now())
 where admin_reply is not null and uye_okudu_at is null;

-- Duyuru → yayınlayan hariç herkese bildirim.
create or replace function public.notify_announcement()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  begin
    insert into public.notifications (user_id, type, title, body, data)
    select p.id, 'announcement', '📢 ' || new.title, left(new.content, 200),
           jsonb_build_object('announcement_id', new.id, 'url', 'mesajlar.html?sekme=duyurular')
      from public.profiles p
     where p.id is distinct from new.admin_id;
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists trg_notify_announcement on public.announcements;
create trigger trg_notify_announcement after insert on public.announcements
  for each row execute function public.notify_announcement();

-- Admin mesajı (Yeni Mesaj ile başlatılan konuşma = INSERT'te admin_reply dolu) ya da üyenin mesajına admin yanıtı
-- (admin_reply boş → dolu) → konuşmanın üyesine bildirim.
create or replace function public.notify_admin_message()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.admin_reply is null or new.from_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.admin_reply is not distinct from new.admin_reply then return new; end if;
  if new.from_id = '4f965624-e524-4cb0-a351-3368f1297d28'::uuid then return new; end if;
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (new.from_id, 'admin_message', 'Admin''den yeni mesaj', left(new.admin_reply, 200),
            jsonb_build_object('message_id', new.id, 'url', 'mesajlar.html'));
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists trg_notify_admin_message on public.messages;
create trigger trg_notify_admin_message after insert or update of admin_reply on public.messages
  for each row execute function public.notify_admin_message();

-- ── Doğrulama (geri alınır; kimseye bildirim gitmez) ──────────────────────────────────────────────
-- do $$ declare n int; begin
--   insert into announcements (admin_id, title, content) values ('4f965624-e524-4cb0-a351-3368f1297d28', 'DENEME', 'deneme');
--   select count(*) into n from notifications where type = 'announcement' and title = '📢 DENEME';
--   raise exception 'duyuru bildirimi: % (beklenen: admin hariç profil sayısı) — geri alındı', n;
-- end $$;
