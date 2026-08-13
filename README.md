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
| Yerel kalıcılık | localStorage (yalnızca aktif sayaç durumu) |

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
  src/
    api.js                  fetch sarmalayıcı + token yönetimi
    App.jsx                 yönlendirme (oturum yoksa giriş ekranı)
    components/Timer.jsx    sağ üstteki sayaç
    components/Layout.jsx   üst bar + gezinme
    context/AuthContext.jsx oturum durumu
    context/SessionsContext.jsx çalışma kayıtları
    hooks/useTimer.js       sayaç mantığı (localStorage + fark hesabı)
    lib/time.js             süre/tarih biçimlendirme, güne göre gruplama
    pages/                  Login, SessionsPage, NotesPage
server/
  src/
    app.js                  Express uygulaması (dinlemez, dışa aktarılır)
    index.js                uzun ömürlü sunucu girişi (yerel, Render)
    db.js                   bağlantı havuzu + şema
    auth.js                 JWT üretimi/doğrulaması
    mailer.js               şifre sıfırlama e-postası
    rateLimit.js            IP başına istek sınırı
    routes/                 auth, sessions, notes
  scripts/
    import-sqlite.mjs       eski SQLite verisini Postgres'e aktarır
api/
  index.js                  Vercel serverless giriş noktası
```

## Sayaç nasıl çalışıyor?

Sayaç açıkken yalnızca **başlangıç zamanı** localStorage'a (`zt:timer:<kullanıcı_id>`)
yazılır. Ekranda gösterilen süre her zaman `şimdi - başlangıç` farkından hesaplanır;
`setInterval` sadece ekranı saniyede bir tazelemek için çalışır. Bu yüzden bilgisayar
uyku moduna girse veya tarayıcı arka plan sekmesinde `setInterval`'i kıssa da süre
sapmaz.

Anahtar kullanıcı kimliğini içerdiği için aynı tarayıcıda farklı hesaplara geçildiğinde
sayaçlar birbirine karışmaz. Aynı hesabın açık diğer sekmeleri `storage` olayıyla
senkron kalır.

"Bitir"e basıldığında oturum veritabanına yazılır ve localStorage temizlenir. Kayıt
sırasında bir hata olursa sayaç durmaz, böylece süre kaybolmaz.

### Sekme kapatılınca sayaç durur

Sayfa **yenilendiğinde** sayaç kaldığı yerden devam eder, ancak sekme **tamamen
kapatıldığında** oturum kapanma anında bitirilmiş sayılır ve uygulama bir daha
açıldığında veritabanına yazılır. Sayaç bileşeninde bunu bildiren bir satır çıkar
("Sekme kapandığı için sayaç 01:00'de durduruldu, 8s 00dk kaydedildi").

Bu üç durumu ayırt etmek için:

- **Yenileme mi, kapanma mı?** `sessionStorage`'daki sekme işareti yenilemede korunur,
  sekme kapanınca silinir.
- **Başka sekme açık mı?** Uygulama açılışta `BroadcastChannel` üzerinden diğer sekmelere
  "açık mısın?" diye sorar. Cevap gelirse sayaç durdurulmaz — ikinci bir sekme açmak
  çalışan sayacı öldürmez. Kapanışı yakalamak için `pagehide`'a *güvenilmez*: sekme
  kapatılırken bu olay tetiklenmeyebiliyor.
- **Ne zaman durduruldu?** Açık her sekme 5 saniyede bir localStorage'a canlılık damgası
  yazar; oturum, bu son damganın zamanında bitirilir. `pagehide` tetiklenebilirse damga
  daha da hassaslaşır.

Kayıt önce localStorage'da "bekleyen" olarak tutulur, sunucuya yazılınca silinir. API o
sırada erişilemezse kayıt kuyrukta kalır ve sonraki açılışta yeniden denenir.

> Not: Bu davranış, ilk şartnamedeki "sekme kapatılıp açılsa bile sayaç korunmalıdır"
> maddesinin yerini alır. Yenileme/gezinme hâlâ sayacı korur; yalnızca sekmenin
> kapatılması onu sonlandırır.

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
| POST | `/api/sessions` | Kayıt ekle (`start_time`, `end_time`) |
| PATCH | `/api/sessions/:id` | Kayıt düzenle |
| DELETE | `/api/sessions/:id` | Kayıt sil |
| GET | `/api/notes` | Notları listele |
| POST | `/api/notes` | Not ekle (`content`) |
| PATCH | `/api/notes/:id` | Not düzenle (`content` ve/veya `is_done`) |
| DELETE | `/api/notes/:id` | Not sil |

Zamanlar ISO 8601 (UTC) olarak saklanır, arayüzde yerel saate çevrilir. `duration_seconds`
sunucuda hesaplanır; istemciden gelen süreye güvenilmez.

## Veri modeli

**users**: `id`, `email` (benzersiz), `password_hash`, `created_at`, `password_changed_at`
**work_sessions**: `id`, `user_id`, `start_time`, `end_time`, `duration_seconds`, `created_at`
**notes**: `id`, `user_id`, `content`, `is_done`, `created_at`, `updated_at`
**password_resets**: `id`, `user_id`, `code_hash`, `expires_at`, `attempts`, `used_at`, `created_at`

`user_id` alanları `ON DELETE CASCADE` ile `users`'a bağlıdır.

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
  (17:00 → 01:00) başladığı günün altında tek satır olarak görünür.
