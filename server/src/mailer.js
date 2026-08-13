import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

/** SMTP tanımlı değilse uygulama yine çalışır; kod sunucu konsoluna yazılır. */
export const mailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

const transporter = mailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT ?? 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null

const from = SMTP_FROM || SMTP_USER

/**
 * Doğrulama kodunu gönderir.
 * @returns {Promise<boolean>} true: e-posta gönderildi, false: konsola yazıldı.
 * SMTP tanımlı ama gönderim başarısızsa hata fırlatır — sessizce yutmuyoruz,
 * aksi halde kullanıcı gelmeyecek bir e-postayı beklerdi.
 */
export async function sendResetCode(email, code, minutesValid) {
  if (!transporter) {
    console.log(
      `\n=== ŞİFRE SIFIRLAMA ===\n  E-posta : ${email}\n  Kod     : ${code}\n` +
        `  Geçerlilik: ${minutesValid} dakika\n` +
        `  (SMTP tanımlı değil; kodu buradan okuyabilirsiniz.)\n=======================\n`
    )
    return false
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: `Zaman Takip şifre sıfırlama kodu: ${code}`,
    text:
      `Şifrenizi sıfırlamak için doğrulama kodunuz: ${code}\n\n` +
      `Kod ${minutesValid} dakika geçerlidir.\n` +
      `Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
    html:
      `<p>Şifrenizi sıfırlamak için doğrulama kodunuz:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>` +
      `<p>Kod <strong>${minutesValid} dakika</strong> geçerlidir.</p>` +
      `<p style="color:#64748b;font-size:13px">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
  })

  return true
}
