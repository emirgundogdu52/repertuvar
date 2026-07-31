# Çalışma notları

## 2026-07-31 — works ortak katalog / grup filtresi

Karar: **geçiş sürümü**. `group_id IS NULL` = herkesin gördüğü ortak katalog,
`group_id = <gid>` = yalnızca o grubun eserleri. Gruba üye **olmayana hiç grup
kısıtı konmaz** — `group_id.is.null` bile. Sebep: Haziran'daki multi-tenant
göçünün artığı olarak bugün 415 satırın hepsi tek gruba etiketli ve NULL satır
yok; `is.null` konsaydı grupsuz kullanıcı bugün gördüğü listeyi kaybederdi.
Bu hâliyle kod hem göç öncesi hem göç sonrası veriyle doğru çalışır.

### Uygulanan kod (eserler.html → `syncWorksFromServer`)

```js
const groupExpr = groupId ? 'or(group_id.is.null,group_id.eq.'+groupId+')' : null;
const statusExpr = (isAdmin() || isEditor()) ? null
  : 'or(status.eq.approved,and(status.eq.pending,submitted_by.eq.'+uid+'))';
const parts = [groupExpr, statusExpr].filter(Boolean);
const filter = parts.length ? '&and=('+parts.join(',')+')' : '';
const base = '/rest/v1/works?order=name&limit=10000'+filter;
```

PostgREST'te aynı sorguda iki ayrı `or=` parametresi çakışır; ikisi tek bir
`and=(…)` içinde birleştirildi. İç içe mantık operatörleri `and=()` içinde
`or(...)` biçiminde yazılır — başlarına `=` gelmez.

### Dört senaryonun ürettiği tam URL

Mantık gerçekten çalıştırılarak üretildi. `<gid>` ve `<uid>` yer tutucudur —
aşağıdaki değerler örnektir, gerçek kimlikler değil.
`&select=…` = FAZ 1 hafif alan listesi (güfte/akor/nota hariç).

**1) üye + grup**
```
/rest/v1/works?order=name&limit=10000&and=(or(group_id.is.null,group_id.eq.<gid>),or(status.eq.approved,and(status.eq.pending,submitted_by.eq.<uid>)))&select=id,name,composer,lyric_writer,makam,form,measurement,instrument,tuning,closing_note,region,source_person,video_link,status,submitted_by,submitter_email,submitted_at
```

**2) üye + grupsuz** — grup kısıtı yok, yalnızca statü
```
/rest/v1/works?order=name&limit=10000&and=(or(status.eq.approved,and(status.eq.pending,submitted_by.eq.<uid>)))&select=…
```

**3) admin/editör + grup** — statü kısıtı yok
```
/rest/v1/works?order=name&limit=10000&and=(or(group_id.is.null,group_id.eq.<gid>))&select=…
```

**4) admin/editör + grupsuz** — hiç kısıt yok, `and=()` parametresi hiç eklenmez
```
/rest/v1/works?order=name&limit=10000&select=…
```

### Bu değişikliğin veri üzerindeki etkisi

| Kullanıcı | Önce | Sonra (göç öncesi veri) | Göçten sonra |
|---|---|---|---|
| Emir'in grubu | 415 | 415 | 415 |
| test2 (kendi grubu) | 0 | 0 | katalog |
| Gruba üye olmayan | 415 | 415 | katalog |

Hiçbir adımda kimse boş liste görmüyor. test2'nin sunucudan 0 alması göç
sonrasına kadar sürüyor — beklenen durum.

---

## 2026-07-31 — ⚠️ db.js:168 tüm filtrelemeyi geçersiz kılıyor

**Doğrulandı, DEĞİŞTİRİLMEDİ.** Göç sonrası dört okuma yolu birlikte ele alınacak.

`db.js:168` `works`'ü **filtresiz** çekiyor:
```js
fetch(SUPA_URL + '/rest/v1/works?select=*&order=name.asc&limit=10000', { headers })
```
ve `db.js:174` sonucu **komple yazıyor**:
```js
if (worksRes.ok) await db.works.replaceAll(await worksRes.json());
```

`replaceAll` olduğu için bu, eserler.html'in filtreli senkronunun IndexedDB'ye
yazdığı her şeyi **eziyor**. eserler.html ise local-first: `loadWorksFromSupabase()`
önce IndexedDB'den çizip sonra arka planda sunucuyla tazeliyor.

**Sonuç:** test2 yerel kopyada 415 eseri bu yüzden görüyor. Ve eserler.html'e
eklediğim sunucu tarafı filtre, db.js senkronu çalıştığı sürece kullanıcının
gördüğünü **tek başına değiştirmiyor** — filtreli sonuç, filtresiz `replaceAll`
tarafından geri alınıyor.

Karşılaştırma — `db.js` diğer tabloları grup kapsamıyla çekiyor:
- `repFilter` → `or=(owner_id.eq.<uid>,group_id.eq.<gid>,is_public.eq.true)`
- `solFilter` → `group_id=eq.<gid>`
- `works` → **kısıt yok** (tek istisna)

db.js:155-158'deki yorum bu tuzağı `repertoires` için zaten biliyor: "üçü farklı
gid değerlerine göre çekip replaceAll ile birbirinin cache'ini ezerek kapsam dışı
repertuvarları geri sızdırabilir." Aynı mekanizma `works` için de geçerli.

### Göç sonrası ele alınacak dört okuma yolu

| Yer | Sorgu | Grup kısıtı |
|---|---|---|
| eserler.html `syncWorksFromServer` | `works?order=name&limit=10000&and=(…)` | ✅ var (yeni) |
| db.js:168 | `works?select=*&order=name.asc&limit=10000` | ❌ yok → `replaceAll` ile eziyor |
| stage.html:719 | `works?select=*&order=id&limit=2000` | ❌ yok |
| repertoires.js:259 | `works?order=name&limit=2000` | ❌ yok |
| index.html:460,462,490 | `works?select=id&limit=1` / `…status=eq.approved` / `…limit=6` | ❌ yok |

`group_id.eq.<gid>` taşıyan ama farklı tabloya ait sorgular (`repertoires`,
`solistler`): repertoires.js:328,332 · db.js:162,164 · stage.html:824,832 —
`is_public`/`owner_id` alternatiflerini zaten `or=` ile taşıyorlar, `works`
kararından etkilenmiyorlar.

---

## 2026-07-31 — boşluksuz varyant taraması

Önceki kabuk doğrulamalarım `grep "|| SUPA_KEY"` (literal boşluk) kullanıyordu,
`||SUPA_KEY` biçimini kaçırıyordu. Boşluğa duyarsız tarama
(`\|\|\s*SUPA_KEY`, `Bearer\s*'\s*\+\s*SUPA_KEY`, `getToken\(\)\s*\|\|`)
yorumlar hariç tutularak çalıştırıldı.

### ⚠️ Gerçek kaçak: eserler.html:3722

```js
async function deleteWork(id) {
  const r = await fetch(SUPA_URL+'/rest/v1/works?id=eq.'+id, {
    method: 'DELETE',
    headers: {'apikey': SUPA_KEY, 'Authorization': 'Bearer '+(getToken()||SUPA_KEY)}
  });
```

`works` üzerinde **DELETE**, anon fallback'li. `d549cf0`'ın plan listesinde [B]
olarak vardı ama düzenleme betiği o satıra dokunmadı; doğrulama grep'i de
boşluk yüzünden kaçırdı. Sonuç: **"eserler.html'de hiç fallback kalmadı" iddiası
yanlıştı.** Ölü oturumda silme isteği anon anahtarla gidip RLS'e takılır ve
kullanıcı "Silme hatası" yerine sessiz başarısızlık görür.

Doğrulama:
```
grep -c "|| SUPA_KEY" eserler.html  -> 0
grep -c "||SUPA_KEY"  eserler.html  -> 1
```

### Klasik desenin kaçırdığı diğer satırlar

| Yer | Satır | Not |
|---|---|---|
| eserler.html | 3722 | **gerçek kaçak, düzeltilecek** |
| _st.js | 11 | zaten bekleyen listede |
| login.html | 336 | `\|\| ''` — farklı sınıf, anon anahtar değil; login.html auth.js yüklemiyor |
| www/* kopyaları | — | düzenlenmez, `./deploy.sh` senkronlar |

### Kalan dosyalarda bulunan (zaten bekleyen listede)

`uyeler.html` 194,263,279,295,322,336,352,368 · `ayarlar.html` 132(`SUPA_KEY_L`),727,771,831,864 ·
`stage.html` 766,1045,1181 + sabit anon 693,720,1939,1942 ·
`uyeler_current.html` 225,240,256 · `_st.js` 11,280 + sabit anon 2,858,861 ·
`_stats.js` 9 · `index.html` 452 · `istatistikler.html` 165 · `mesajlar.html` 243 ·
`toplu-makam.html` 67 · `topnav.js` 1092 (sabit anon) · `arac/temizle.html` 64 (sabit anon)

Kasıtlı sabit anon (dokunulmayacak): `auth.js:215` `_isAnonAuthz` karşılaştırması,
`auth.js:375` `anonHeaders()` gövdesi.

**Not:** taramanın "132 eşleşme" toplamı şişkin — ikinci desen (`sb_token') ||`)
birinciyle örtüşüyor, aynı satırlar iki kez sayıldı. Ayrık satır sayısı çok daha az.

### Çıkarım

Bundan sonra doğrulama grep'leri boşluğa duyarsız olmalı:
`grep -nE "\|\|[[:space:]]*SUPA_KEY"` — literal boşluklu desen kullanma.

---

## AÇIK MADDE — "istek başarılı" ≠ "satır değişti"

**Sınıf:** (1) adımının dışında, ayrı bir iş. Başlık düzeltmeleriyle **çözülmedi**
ve çözülemez — geçerli tokenla da oluşur.

PostgREST'te `Prefer: return=minimal` ile yapılan DELETE/PATCH, RLS hiçbir satır
eşleştirmese bile **204 No Content** döner. Kod `r.ok || r.status === 204`
kontrolüyle bunu başarı sayıp yerel durumu güncelliyor; sunucuda ise satır
olduğu gibi duruyor. Kullanıcı işlemin olduğunu sanıyor, bir sonraki senkronda
kayıt geri geliyor.

### Etkilenen yerler (eserler.html, `d4b9864` sonrası satırlar)

| Fonksiyon | Satır | İşlem | Bugünkü kontrol |
|---|---|---|---|
| `rejectWork` | 3964 | `works` DELETE | `r.ok \|\| r.status === 204` → satırı DATA'dan siler, DOM'dan kaldırır |
| `deleteWork` | 3721 | `works` DELETE | `!r.ok && r.status !== 204` → yerel listeden siler |
| `approveWork` | 3945 | `works` PATCH | `r.ok \|\| r.status === 204` → rozeti "✓ Onaylandı" yapar |
| `assignEditor` | 3880 | `profiles` PATCH | dönüş hiç kontrol edilmiyor, doğrudan "başarılı" mesajı |
| `removeEditor` | 3898 | `profiles` PATCH | dönüş hiç kontrol edilmiyor, `showEditorManager()` çağrılıyor |

`rejectWork` en kritiği: eser ekrandan siliniyor, kullanıcı reddettiğini
sanıyor, eser veritabanında duruyor ve bekleyen kuyruğunda geri beliriyor.

### Düzeltme seçenekleri

1. `Prefer: return=representation` → dönen diziyi say, `length === 0` ise hata.
   DELETE ve PATCH'in ikisinde de çalışır, ek istek gerektirmez.
2. `Prefer: count=exact` → `Content-Range` başlığını oku (`0-0/1` vs `*/0`).
3. Yalnız PATCH için: dönen satırı okuyup beklenen alanın gerçekten değiştiğini
   doğrula (örn. `status === 'approved'`).

(1) en az değişiklikle en çok yeri kapatıyor.

### Kapsam notu

Aynı desen büyük olasılıkla diğer dosyalarda da var (`gruplar.html`,
`uyeler.html`, `ayarlar.html`, `repertoires.js` — hepsi `Prefer: return=minimal`
ile PATCH/DELETE yapıyor). Bu madde ele alınırken önce tam bir tarama gerekir:
`Prefer.*return=minimal` geçen her çağrının dönüş kontrolü incelenmeli.
