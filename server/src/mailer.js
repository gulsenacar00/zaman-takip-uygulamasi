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
      `\n=== PASSWORD RESET ===\n  Email : ${email}\n  Code  : ${code}\n` +
        `  Valid for: ${minutesValid} minutes\n` +
        `  (SMTP is not configured; you can read the code here.)\n======================\n`
    )
    return false
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: `Focus password reset code: ${code}`,
    text:
      `Your verification code for resetting your password: ${code}\n\n` +
      `The code is valid for ${minutesValid} minutes.\n` +
      `If you did not request this, you can ignore this email.`,
    html:
      `<p>Your verification code for resetting your password:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>` +
      `<p>The code is valid for <strong>${minutesValid} minutes</strong>.</p>` +
      `<p style="color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>`,
  })

  return true
}
