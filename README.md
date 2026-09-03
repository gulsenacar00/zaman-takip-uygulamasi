# Zaman Takip ve Not Uygulaması

Çalışma sürelerini tek düğmeli bir sayaçla kaydeden ve kullanıcıya özel not/TODO tutan
basit bir web uygulaması.

## Teknoloji

| Katman | Teknoloji |
|---|---|
| Build | Vite 6 |
| Frontend | React 19 + React Router 7 |
| Stil | Tailwind CSS 4 |
| Backend | Express 4 |
| Veritabanı | PostgreSQL (`pg`) |
| Kimlik doğrulama | bcrypt ile hash + JWT |
| Yerel kalıcılık | localStorage (oturum tokenı, tema tercihi, sekmeler arası eşitleme damgası) |

Veritabanı sunucu tarafında tutulur; aynı hesapla başka bir bilgisayardan girildiğinde
tüm kayıtlar ve notlar gelir. Native derleme gerektiren bağımlılık yoktur.

## Kurulum

```bash
npm run install:all
```

## Geliştirme

Veritabanı adresini tanımlayın:

```bash
copy server\.env.example server\.env
```

`server/.env` içindeki `DATABASE_URL` alanına Postgres bağlantı adresinizi yazın.
Hiçbir kurulum yapmadan denemek isterseniz `DATABASE_URL=pglite` yazabilirsiniz —
uygulama gömülü, bellek içi bir Postgres üzerinde çalışır (veriler kalıcı olmaz).

```bash
npm run dev
```

- İstemci: http://localhost:5173 (API istekleri 3001'e proxy'lenir)
- API: http://localhost:3001

`JWT_SECRET` tanımlanmazsa yerelde `server/data/.jwt-secret` dosyasında otomatik üretilir.
**Yayında mutlaka ayarlayın**: anahtar değişirse tüm kullanıcıların oturumu kapanır.

## Yayına alma (Vercel + Postgres)

Depoda [`vercel.json`](vercel.json) var; Vercel depoyu bağladığınızda ayarları oradan okur.
İstemci statik olarak, API ise `api/index.js` üzerinden serverless fonksiyon olarak yayınlanır.

1. **Veritabanı**: [neon.tech](https://neon.tech) veya [supabase.com](https://supabase.com)
   üzerinde ücretsiz bir Postgres oluşturun. Bağlantı adresinin **havuzlanmış (pooled)**
   olanını kopyalayın — Neon'da host adında `-pooler` geçen adres. Serverless'ta her istek
   ayrı bir örnekte çalışabildiği için havuzlanmış adres bağlantı tükenmesini önler.
2. **Proje**: [vercel.com](https://vercel.com) → *Add New* → *Project* → bu depoyu içe aktarın.
3. **Ortam değişkenleri** (*Settings → Environment Variables*):
   - `DATABASE_URL` — 1. adımdaki adres
   - `JWT_SECRET` — rastgele uzun bir dize. Üretmek için:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - İsteğe bağlı: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
4. *Deploy*. Uygulama `https://<proje-adi>.vercel.app` adresinde yayına girer.

Şema ilk istekte otomatik oluşur; elle migration çalıştırmak gerekmez.

> `JWT_SECRET` ayarlanmazsa uygulama çalışır ama her yeni fonksiyon örneğinde anahtar
> değişir ve kullanıcılar sürekli çıkış yapmış olur. Mutlaka tanımlayın.

### Alternatif: kendi sunucunuz (Oracle Cloud Always Free)

Kalıcı diski olan bir sunucuda çalıştırırsanız Postgres'i doğrudan makineye kurabilir,
dışarıdan bir veritabanı hizmetine bağımlı olmazsınız. Oracle Cloud'un Always Free
katmanı bunun için süresiz ücretsiz bir sunucu veriyor.

Adım adım kurulum: [deploy/oracle-cloud.md](deploy/oracle-cloud.md) — systemd birim
dosyası ve otomatik HTTPS için Caddy yapılandırması `deploy/` klasöründe hazır.

### Alternatif: Render

Depoda bir [`render.yaml`](render.yaml) blueprint'i de var. Render'da *New → Blueprint* ile
depoyu seçmeniz ve `DATABASE_URL` girmeniz yeterli; `JWT_SECRET` otomatik üretilir. Render
uzun ömürlü bir sunucu çalıştırdığı için havuzlanmamış bağlantı adresi de kullanılabilir,
ancak ücretsiz servis bir süre istek almazsa uykuya dalar ve ilk istek gecikir.

### Eski SQLite verisini taşıma

Proje önce SQLite kullanıyordu. Elinizdeki `server/data/app.db` dosyasındaki hesapları,
kayıtları ve notları Postgres'e aktarmak için:

```bash
cd server; npm run import:sqlite
```

Script `DATABASE_URL`'in gösterdiği veritabanına yazar, aynı id'ye sahip satırları atlar,
bu yüzden birden fazla kez çalıştırılabilir.

## E-posta (şifre sıfırlama) ayarı

Şifre sıfırlama kodunun gerçekten e-posta ile gitmesi için SMTP tanımlamanız gerekir:

```bash
copy server\.env.example server\.env
```

Ardından `server/.env` içindeki alanları doldurun. Gmail kullanacaksanız normal hesap
şifreniz çalışmaz; Google Hesabı → Güvenlik → 2 Adımlı Doğrulama'yı açıp
**Uygulama şifreleri** bölümünden 16 haneli bir şifre üretin ve `SMTP_PASS` alanına onu
yazın. `.env` git'e girmez.

**SMTP tanımlamazsanız uygulama yine çalışır**: doğrulama kodu e-posta yerine sunucu
konsoluna (`npm run dev` çıktısına) yazılır ve arayüzde bunu belirten bir uyarı çıkar.
Tek kullanıcılı yerel kullanım için bu yeterlidir.

## Üretim

```bash
npm run build
npm start
```

Build sonrası tek sunucu yeter: Express, `client/dist` klasörünü de servis eder →
http://localhost:3001

## Klasör yapısı

```
client/
  public/
    favicon.svg           sekme logosu (saat kuleli bina, temaya uyum sağlar)
  src/
    api.js                  fetch sarmalayıcı + token yönetimi
    App.jsx                 yönlendirme (oturum yoksa giriş ekranı)
    components/Logo.jsx     saat kuleli bina (giriş ekranı ve üst bar)
    components/Timer.jsx    sağ üstteki sayaç + "Başlat" ad kutusu
    components/Layout.jsx   üst bar: gezinme, özetler, sayaç, hesap menüsü
    components/WeekCalendar.jsx  haftalık takvim (yüzdeyle konumlanan bloklar)
    components/SessionProperties.jsx  sağ sütundaki kayıt özellikleri paneli
    context/AuthContext.jsx oturum durumu
    context/SessionsContext.jsx çalışma kayıtları
    context/SelectionContext.jsx takvimde seçili kayıt
    context/ThemeContext.jsx     açık/koyu/sistem teması
    hooks/useTimer.js       sayaç mantığı (sunucudaki sayaç + fark hesabı)
    lib/time.js             süre/tarih biçimlendirme, hafta ve gün yardımcıları
    pages/                  Login, SessionsPage, NotesPage
server/
  src/
    app.js                  Express uygulaması (dinlemez, dışa aktarılır)
    index.js                uzun ömürlü sunucu girişi (yerel, Render)
    db.js                   bağlantı havuzu + şema
    auth.js                 JWT üretimi/doğrulaması
    mailer.js               şifre sıfırlama e-postası
    rateLimit.js            IP başına istek sınırı
    sessionRules.js         süre/ad doğrulama (sessions ve timer ortak kullanır)
    routes/                 auth, sessions, notes, timer
  scripts/
    import-sqlite.mjs       eski SQLite verisini Postgres'e aktarır
api/
  index.js                  Vercel serverless giriş noktası
```

## Sayaç nasıl çalışıyor?

Çalışan sayaç **veritabanında** tutulur (`active_timers` tablosu, kullanıcı başına en
fazla bir satır). Sekmeyi, tarayıcıyı ya da bilgisayarı kapatmak sayacı etkilemez;
yalnızca kullanıcının **"Bitir"** veya **"kaydetmeden vazgeç"** demesi durdurur. Aynı
hesapla başka bir cihazdan girildiğinde de sayaç çalışıyor görünür.

Ekranda gösterilen süre her zaman `şimdi - başlangıç` farkından hesaplanır; `setInterval`
sadece ekranı saniyede bir tazelemek için çalışır. Bu yüzden bilgisayar uyku moduna
girse veya tarayıcı arka plan sekmesinde `setInterval`'i kıssa da süre sapmaz.

Sayaç, sayfanın **sağ üstünde** üst barda durur. "Başlat"a basınca düğmenin hemen altında
küçük bir kutu açılır ve isteyen kullanıcı çalışmaya bir **ad** verebilir. Ad zorunlu
değildir: boş bırakılan kayıtlar takvimde "İsimsiz çalışma" olarak görünür. Sayaç
çalışırken ad, süre ile birlikte üst barda gösterilir.

Günlük ve toplam süre özetleri de üst barda durur; ayrı bir kart alanı kaplamaz.

> Ad kutusu düğmeye göre `absolute` konumlanır, `fixed` **değil**. Üst barda
> `backdrop-blur` var; `backdrop-filter`, `position: fixed` alt öğeler için kapsayıcı
> blok oluşturduğundan sabit konumlu bir kutu ekrana değil üst barın kutusuna göre
> yerleşip kırpılıyor. Aynı sebeple hesap menüsü de `absolute` kullanır.

### Sekme başlığında canlı sayaç

Sayaç çalışırken sekmenin başlığı `00:12:34 · İşin adı` biçiminde saniyede bir
tazelenir; uygulama arka plandayken bile geçen süre sekme çubuğundan okunur. Sayaç
durunca başlık `Zaman Takip`'e döner.

### Durdurma tek bir uçta yapılır

"Bitir", `POST /api/timer/stop` çağırır: sunucu kaydı oluşturur **ve** çalışan sayacı
aynı istekte siler. Ayrı çağrılar olsaydı arada bir kesinti olduğunda ya kayıt kaybolur
ya da aynı aralık iki kez yazılabilirdi. Kayıt sırasında hata olursa sayaç durmaz,
böylece süre kaybolmaz.

Zaten çalışan bir sayaç varken `POST /api/timer` **409** döner; başka bir sekmede veya
cihazda başlatılmış sayaç sessizce ezilmez.

### Sekmeler arası eşitleme

Sayaç başlatıldığında/durdurulduğunda `zt:timer-sync` anahtarına bir damga yazılır;
aynı tarayıcının diğer sekmeleri `storage` olayıyla bunu görüp sunucudaki durumu
yeniden okur. Başka bir cihazdaki değişiklik için sekmeye dönüldüğünde (`focus`,
`visibilitychange`) ve dakikada bir arka planda tazeleme yapılır.

> Önceki sürümde sayaç localStorage'da tutuluyor ve uygulamanın **bütün** sekmeleri
> kapatıldığında otomatik olarak bitirilip kaydediliyordu. Açık sekmeleri izlemek için
> `zt:tabs` altında nabız kaydı, `sessionStorage` işareti ve `pagehide` birlikte
> kullanılıyordu; bu mekanizmanın tamamı kaldırıldı. Eski sürümden kalan çalışan bir
> sayaç varsa ilk açılışta bir kereye mahsus sunucuya taşınır.

## Haftalık takvim

Çalışma kayıtları liste yerine **haftalık takvimde** gösterilir: sütunlar Pazartesi'den
Pazar'a günler, satırlar saatler. Gösterilen saat aralığı o haftanın kayıtlarına göre
daralır/genişler (kayıt yoksa 08:00–18:00). Çakışan oturumlar yan yana şeritlere
yerleştirilir.

Takvim **kaydırma gerektirmez**: bloklar piksel değil yüzde ile konumlanır, ızgara da
kendisine ayrılan yüksekliği kaplar. Saat aralığı 02:00–23:00'e kadar genişlese bile
tümü ekrana sığar. Geniş ekranda uygulama tam ekran yüksekliğine oturur ve sayfa hiç
kaydırılmaz; dar ekranda başlık sarmalandığı için normal akışa dönülür ve takvim
sabit bir yükseklik alır.

Bir bloğa tıklamak **sağ sütunda** özellikler panelini açar: **adı**, başlangıç/bitiş
saatini değiştirebilir veya kaydı silebilirsiniz. Panel yalnızca bir kayıt seçiliyken
görünür; seçim yokken takvim tam genişliği kullanır. Yalnızca ad gönderildiğinde saatler
olduğu gibi korunur. Seçim, takvim ile panelin ortak üstünde (`SelectionContext`)
tutulur.

## Sekme logosu

`client/public/favicon.svg`: üzerinde büyük bir saat kadranı olan bina. Tek bir SVG,
`prefers-color-scheme` ile iki temaya da uyum sağlar — açık sekme çubuğunda koyu bina,
koyu sekme çubuğunda açık bina çizilir, kadran halkası her iki durumda yeşil kalır.
Şekiller 16 px'te dağılmayacak kadar sade tutuldu; kadran, binanın üst yarısını
kaplayacak kadar büyük.

Aynı logo uygulama içinde de görünür: giriş ekranında ve üst barda "Zaman Takip"
yazısının yanında. Bunun için `components/Logo.jsx` kullanılır — favicon işletim
sisteminin `prefers-color-scheme` tercihini okurken uygulama teması `<html>` üzerindeki
`dark` sınıfıyla sürüldüğü için bileşen Tailwind varyantlarıyla renklenir. **Şekiller
iki dosyada da aynıdır; biri değişirse diğeri de güncellenmeli.**

## Hesap menüsü ve tema

Üst barın sağ ucunda, kullanıcının e-postasından üretilen **baş harfleri** taşıyan
yuvarlak bir düğme durur (`ali.veli@…` → "AV"). Tıklanınca altında küçük bir menü açılır:
e-posta adresi, açık/koyu/sistem tema seçimi ve **Çıkış yap**. Menü, dışına tıklanınca
veya Esc ile kapanır.

Tema seçimi `zt:theme` anahtarında saklanır ve açık diğer sekmelere `storage` olayıyla
yayılır. `system` seçiliyken işletim sisteminin tercihi canlı olarak izlenir. Tercih,
React yüklenmeden önce `index.html` içindeki küçük bir betikle uygulanır — aksi halde
koyu tema seçiliyken ilk boyamada açık tema görünüp göz alıyor.

## API

Tüm `/api/sessions` ve `/api/notes` uçları `Authorization: Bearer <token>` ister ve
yalnızca token sahibinin satırlarını görür/değiştirir.

| Method | Yol | Açıklama |
|---|---|---|
| POST | `/api/auth/register` | Kayıt ol → `{ token, user }` |
| POST | `/api/auth/login` | Giriş yap → `{ token, user }` |
| GET | `/api/auth/me` | Token doğrulama |
| POST | `/api/auth/forgot-password` | E-postaya 6 haneli kod gönderir |
| POST | `/api/auth/verify-reset-code` | Kodu doğrular → `{ resetToken }` |
| POST | `/api/auth/reset-password` | `resetToken` + yeni şifre |
| GET | `/api/sessions` | Kayıtları listele |
| POST | `/api/sessions` | Kayıt ekle (`start_time`, `end_time`, isteğe bağlı `title`) |
| PATCH | `/api/sessions/:id` | Kayıt düzenle (`title` ve/veya saatler) |
| DELETE | `/api/sessions/:id` | Kayıt sil |
| GET | `/api/timer` | Çalışan sayaç (yoksa `null`) |
| POST | `/api/timer` | Sayacı başlat (`title`, `started_at`); çalışan varsa 409 |
| POST | `/api/timer/stop` | Sayacı bitir: kaydı oluşturur ve sayacı siler |
| DELETE | `/api/timer` | Sayacı kaydetmeden iptal et |
| GET | `/api/notes` | Notları listele |
| POST | `/api/notes` | Not ekle (`content`) |
| PATCH | `/api/notes/:id` | Not düzenle (`content` ve/veya `is_done`) |
| DELETE | `/api/notes/:id` | Not sil |

Zamanlar ISO 8601 (UTC) olarak saklanır, arayüzde yerel saate çevrilir. `duration_seconds`
sunucuda hesaplanır; istemciden gelen süreye güvenilmez.

## Veri modeli

**users**: `id`, `email` (benzersiz), `password_hash`, `created_at`, `password_changed_at`
**work_sessions**: `id`, `user_id`, `title`, `start_time`, `end_time`, `duration_seconds`, `created_at`
**active_timers**: `user_id` (birincil anahtar), `title`, `started_at` — çalışmakta olan sayaç
**notes**: `id`, `user_id`, `content`, `is_done`, `created_at`, `updated_at`
**password_resets**: `id`, `user_id`, `code_hash`, `expires_at`, `attempts`, `used_at`, `created_at`

`user_id` alanları `ON DELETE CASCADE` ile `users`'a bağlıdır.

Şema `CREATE TABLE IF NOT EXISTS` ile kurulduğu için sonradan eklenen `title` sütunu
`db.js` içindeki ayrı bir `ALTER TABLE … ADD COLUMN IF NOT EXISTS` bloğunda tanımlıdır;
her açılışta güvenle çalışır ve mevcut veritabanlarını günceller.

> Kaldırılan kullanıcı panelinden kalan `users.last_seen_at` sütunu, daha önce
> kurulmuş veritabanlarında durmaya devam eder; hiçbir kod ona dokunmaz. Temizlemek
> isterseniz: `ALTER TABLE users DROP COLUMN last_seen_at;`

## Şifre sıfırlama güvenliği

- Kodlar düz metin saklanmaz, şifreler gibi bcrypt ile hash'lenir.
- Kod 15 dakika geçerli, tek kullanımlık ve en fazla 5 hatalı deneme hakkı var.
- Yeni kod istemek için 60 saniye beklemek gerekir.
- Aynı anda yalnızca en son üretilen kod geçerlidir.
- Kod doğrulandıktan sonra "yeni şifre" adımı 15 dakikalık ayrı bir token ile yetkilendirilir;
  bu token `purpose` alanı sayesinde normal API isteklerinde kullanılamaz.
- Şifre değişince `password_changed_at` güncellenir ve o andan önce üretilmiş tüm oturum
  tokenları geçersiz olur — çalınmış bir token sıfırlamadan sonra işe yaramaz.
- Kayıtlı olmayan bir e-posta için de aynı başarılı yanıt döner; hangi adreslerin kayıtlı
  olduğu denenerek öğrenilemez.

## Bilinen sınırlar

- Kimlik uçlarında IP başına istek sınırı bellekte tutulur; sunucu yeniden başlarsa
  veya birden fazla örneğe çıkılırsa sayaçlar sıfırlanır. Vercel gibi serverless
  ortamlarda her fonksiyon örneği kendi sayacını tuttuğu için sınır daha gevşek
  davranır; sıkı bir kota gerekiyorsa Redis tabanlı bir sayaç gerekir.
- Kayıt herkese açıktır: linki bilen herkes hesap oluşturabilir.
- Token'lar 30 gün geçerlidir. Tek tek iptal edilemezler; yalnızca şifre değişimi tüm
  tokenları topluca geçersiz kılar.
- SMTP tanımlıysa ve gönderim başarısız olursa yanıt 502 döner. Bu, ilgili hesabın var
  olduğunu dolaylı olarak ele verir — hata mesajının kullanışlılığı için kabul edilen
  bilinçli bir ödünleşme.
- Kayıtlar güne göre **başlangıç saatine** göre gruplanır; gece yarısını aşan bir oturum
  (17:00 → 01:00) başladığı günün sütununda görünür ve blok gün sonunda kesilir —
  ertesi güne taşan kısım takvimde çizilmez, süre toplamları doğru kalır.
- Uygulamada kullanıcılar birbirini görmez; her hesap yalnızca kendi kayıtlarına ve
  notlarına erişir.
- Sayaç yalnızca kullanıcı durdurduğunda durur. Unutulan bir sayaç günlerce çalışır ve
  7 günü aştığında `POST /api/timer/stop` "Bir oturum 7 günden uzun olamaz." hatası
  verir; bu durumda kayıt "kaydetmeden vazgeç" ile iptal edilmelidir.
- Sayacın başlangıç/bitiş zamanını istemci gönderir (uygulamanın geri kalanı da öyle
  çalışıyor). Cihazın saati belirgin şekilde yanlışsa kaydedilen saatler de kayar.
