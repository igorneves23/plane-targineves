import nodemailer from 'nodemailer'

const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  authMethod: 'LOGIN',
  tls: { rejectUnauthorized: false },
})

function emailHeader(): string {
  return `
    <div style="text-align:center;padding:24px 0 16px;border-bottom:1px solid #e5e7eb;margin-bottom:24px">
      <div style="display:inline-flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:#6366f1;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px">P</div>
        <span style="font-size:20px;font-weight:bold;color:#1e293b">Plane</span>
      </div>
    </div>
  `
}

function emailFooter(): string {
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
      Plane — Igreja Presbiteriana de Curitiba
    </p>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function resetPasswordEmailHtml(name: string, resetLink: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:0 16px">
      ${emailHeader()}
      <h2 style="color:#4f46e5;margin:0 0 4px">Redefinição de senha 🔑</h2>
      <p style="color:#374151">Olá, <strong>${escapeHtml(name)}</strong>!</p>
      <p style="color:#374151">Recebemos uma solicitação para redefinir a senha da sua conta no Plane.</p>
      <p style="color:#374151">Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>

      <a href="${resetLink}"
         style="display:inline-block;background:#6366f1;color:#fff;font-weight:bold;text-decoration:none;
                padding:12px 28px;border-radius:12px;margin:16px 0">
        Redefinir minha senha →
      </a>

      <p style="color:#9ca3af;font-size:13px;margin-top:16px">
        Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá a mesma.
      </p>
      ${emailFooter()}
    </div>
  `
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  if (!process.env.EMAIL_HOST) {
    console.warn('[mailer] EMAIL_HOST não configurado — email de reset não enviado. Link:', resetUrl)
    return
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Plane <comunicaris@ipctba.org.br>',
    to,
    subject: 'Redefinição de senha — Plane',
    html: resetPasswordEmailHtml(name, resetUrl),
  })
}
