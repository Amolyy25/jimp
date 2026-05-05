import { Resend } from 'resend';
import crypto from 'node:crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

const BASE_URL = process.env.PUBLIC_ORIGIN || 'https://persn.me';

function emailShell(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>persn.me</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:900;letter-spacing:0.14em;color:rgba(255,255,255,0.9);text-transform:uppercase;">PERSN.ME</span>
                  </td>
                  <td align="right">
                    <span style="font-family:monospace;font-size:10px;letter-spacing:0.18em;color:rgba(255,255,255,0.2);text-transform:uppercase;">persn.me</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
              <!-- Accent bar -->
              <div style="height:3px;background:linear-gradient(90deg,#5865F2 0%,#7c3aed 100%);"></div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.16em;color:rgba(255,255,255,0.2);text-transform:uppercase;">
                © 2026 persn.me &nbsp;·&nbsp; Built in France
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, label) {
  return `<table cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:999px;background:#ffffff;">
        <a href="${href}"
           style="display:inline-block;padding:14px 32px;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:999px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

async function send({ to, subject, html }) {
  if (!resend) {
    console.warn('[mailer] Skipping email: RESEND_API_KEY not set.');
    console.log(`[mailer] Would send "${subject}" to ${to}`);
    return;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: 'persn.me <noreply@persn.me>',
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error('[mailer] send error:', error);
    } else {
      console.log(`[mailer] "${subject}" sent to ${to} (id: ${data.id})`);
    }
  } catch (err) {
    console.error('[mailer] unexpected error:', err.message);
  }
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-0.01em;color:#ffffff;line-height:1.1;">
      Confirmez votre email
    </h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.55);">
      Merci de rejoindre persn.me. Un clic suffit pour activer votre compte et commencer à construire votre profil.
    </p>
    ${ctaButton(verifyUrl, 'Confirmer mon email')}
    <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.3);">
      Ce lien expire dans <strong style="color:rgba(255,255,255,0.45);">24 heures</strong>.
      Si vous n'avez pas créé de compte, ignorez cet email.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <tr>
        <td style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.2);text-transform:uppercase;">
          Si le bouton ne fonctionne pas, copiez ce lien :
        </td>
      </tr>
      <tr>
        <td style="padding-top:6px;font-family:monospace;font-size:10px;color:rgba(88,101,242,0.7);word-break:break-all;">
          ${verifyUrl}
        </td>
      </tr>
    </table>
  `;

  await send({
    to: email,
    subject: 'Confirmez votre adresse email — persn.me',
    html: emailShell(content),
  });
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-0.01em;color:#ffffff;line-height:1.1;">
      Réinitialisation du mot de passe
    </h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.55);">
      Vous avez demandé à réinitialiser le mot de passe de votre compte persn.me.
      Cliquez ci-dessous pour en choisir un nouveau.
    </p>
    ${ctaButton(resetUrl, 'Réinitialiser mon mot de passe')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
      <tr>
        <td style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.3);text-transform:uppercase;">
          ⏱ Ce lien expire dans <strong style="color:rgba(255,255,255,0.5);">1 heure</strong>
        </td>
      </tr>
      <tr>
        <td style="padding-top:6px;font-family:monospace;font-size:10px;letter-spacing:0.12em;color:rgba(255,255,255,0.25);text-transform:uppercase;">
          À usage unique · non transférable
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.3);">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      Votre mot de passe actuel reste inchangé.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
      <tr>
        <td style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.2);text-transform:uppercase;">
          Si le bouton ne fonctionne pas, copiez ce lien :
        </td>
      </tr>
      <tr>
        <td style="padding-top:6px;font-family:monospace;font-size:10px;color:rgba(88,101,242,0.7);word-break:break-all;">
          ${resetUrl}
        </td>
      </tr>
    </table>
  `;

  await send({
    to: email,
    subject: 'Réinitialisation de votre mot de passe — persn.me',
    html: emailShell(content),
  });
}

export async function sendBanEmail(email, reason) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-0.01em;color:#ef4444;line-height:1.1;">
      Compte suspendu
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.55);">
      Votre compte persn.me a été suspendu suite à une violation de nos
      <a href="${BASE_URL}/terms" style="color:rgba(88,101,242,0.8);text-decoration:none;">conditions d'utilisation</a>.
    </p>
    ${reason ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 6px;font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(239,68,68,0.6);">Motif de la suspension</p>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;">${reason}</p>
        </td>
      </tr>
    </table>
    ` : ''}
    <p style="margin:0;font-size:13px;line-height:1.65;color:rgba(255,255,255,0.35);">
      Cette décision est définitive. Si vous pensez qu'il s'agit d'une erreur,
      répondez à cet email pour contacter notre équipe de modération.
    </p>
  `;

  await send({
    to: email,
    subject: 'Information importante concernant votre compte persn.me',
    html: emailShell(content),
  });
}
