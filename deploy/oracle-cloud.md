# Oracle Cloud (Always Free) sunucusuna kurulum

Kendi sunucunuzda çalıştırdığınızda kalıcı diskiniz olur; Postgres'i doğrudan makineye
kurarsınız ve dışarıdan bir veritabanı hizmetine ihtiyaç kalmaz.

Oracle'da AWS'deki "EC2"nin karşılığı **Compute Instance**'tır. Always Free katmanı
süresizdir (Ampere ARM: 4 çekirdek / 24 GB RAM'e kadar).

> **Baştan bilinmesi gerekenler**
> - Hesap açarken kimlik doğrulama için kredi kartı istenir. Always Free kaynaklarda
>   ücret çıkmaz, ama kart adımı atlanamaz.
> - Popüler bölgelerde Ampere kapasitesi sık sık dolu olur ("Out of capacity" hatası).
>   Başka bir kullanılabilirlik alanı deneyin veya AMD (`VM.Standard.E2.1.Micro`) seçin.
> - Oracle, uzun süre boştaki Always Free sunucuları geri alabiliyor. Uygulama düzenli
>   kullanılıyorsa sorun olmaz.

---

## 1. Sunucuyu oluşturun

Oracle Cloud panelinde **Compute → Instances → Create Instance**:

- **Image**: Ubuntu 24.04 (veya 22.04)
- **Shape**: `VM.Standard.A1.Flex` (ARM, 1–4 OCPU / 6–24 GB) — Always Free
- **SSH keys**: kendi genel anahtarınızı yükleyin (yoksa `ssh-keygen -t ed25519` ile üretin)
- Genel IP atanmış olsun (varsayılan açık)

Oluşunca genel IP adresini not edin ve bağlanın:

```bash
ssh ubuntu@SUNUCU_IP
```

## 2. Portları açın — iki katman var

Bu adım atlanırsa site cevap vermez. Oracle'ın Ubuntu imajları, bulut güvenlik
kuralından bağımsız olarak **makine içinde de** trafiği engeller.

**a) Bulut tarafı:** Instance → Virtual Cloud Network → Security List → *Add Ingress Rules*.
Kaynak `0.0.0.0/0`, hedef portlar **80** ve **443** (TCP) için birer kural ekleyin.

**b) Makine tarafı:**

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Uygulamanın kendi portunu (3001) dışarı açmayın; dışarıya yalnızca Caddy bakacak.

## 3. Gerekli paketleri kurun

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git postgresql

# Caddy (otomatik HTTPS'li ters vekil)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 4. Veritabanını hazırlayın

```bash
sudo -u postgres psql -c "CREATE USER zaman WITH PASSWORD 'BURAYA_GUCLU_BIR_PAROLA';"
sudo -u postgres psql -c "CREATE DATABASE zamantakip OWNER zaman;"
```

Postgres yalnızca `localhost`'u dinler; dışarıya açmanıza gerek yok.

## 5. Uygulamayı kurun

```bash
cd ~
git clone https://github.com/gulsenacar00/zaman-takip-uygulamasi.git
cd zaman-takip-uygulamasi
npm run install:all
npm run build
```

Ortam değişkenlerini yazın:

```bash
cp server/.env.example server/.env
nano server/.env
```

En az şu iki satır dolu olmalı:

```
DATABASE_URL=postgresql://zaman:BURAYA_GUCLU_BIR_PAROLA@localhost:5432/zamantakip
JWT_SECRET=<aşağıdaki komutun ürettiği değer>
```

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`.env` dosyasını yalnızca kendi kullanıcınız okuyabilsin:

```bash
chmod 600 server/.env
```

## 6. Servis olarak çalıştırın

```bash
sudo cp deploy/zaman-takip.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now zaman-takip
sudo systemctl status zaman-takip
```

Günlükler: `journalctl -u zaman-takip -f`

## 7. Alan adı ve HTTPS

Alan adınız yoksa [duckdns.org](https://www.duckdns.org) üzerinden ücretsiz bir alt alan
adı alıp sunucunun IP'sine yönlendirin. Sonra:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # ilk satırdaki alan adını kendi adresinizle değiştirin
sudo systemctl reload caddy
```

Caddy sertifikayı otomatik alır. Adresi tarayıcıda açtığınızda uygulama HTTPS ile çalışır.

> **HTTPS'siz kullanmayın.** Düz HTTP üzerinden giriş yaparsanız şifreniz ağda açık
> metin olarak gider.

## 8. Eski verinizi taşıyın (isteğe bağlı)

Windows'taki `server/data/app.db` dosyasını sunucuya kopyalayıp aktarabilirsiniz:

```bash
# Windows tarafında:
scp server\data\app.db ubuntu@SUNUCU_IP:~/app.db

# Sunucuda:
cd ~/zaman-takip-uygulamasi/server
npm run import:sqlite -- ~/app.db
sudo systemctl restart zaman-takip
```

(Dosyayı `server/data/app.db` konumuna koyarsanız yol vermeden `npm run import:sqlite`
demeniz de yeterli.)

---

## Güncelleme

```bash
cd ~/zaman-takip-uygulamasi
git pull
npm run install:all
npm run build
sudo systemctl restart zaman-takip
```

## Sık karşılaşılan sorunlar

| Belirti | Sebep |
|---|---|
| Site hiç açılmıyor, zaman aşımı | 2. adımdaki **iki** katmandan biri eksik (çoğunlukla iptables) |
| Caddy sertifika alamıyor | Alan adı henüz sunucunun IP'sine yönlenmemiş, ya da 80 portu kapalı |
| `zaman-takip` servisi sürekli yeniden başlıyor | `journalctl -u zaman-takip -n 50` — genelde `DATABASE_URL` hatalı |
| `password authentication failed` | 4. adımdaki parola ile `.env` içindeki parola tutmuyor |
