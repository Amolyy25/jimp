import { Resend } from 'resend';
import crypto from 'node:crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Generates a secure random token for email verification.
 */
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sends a verification email via Resend.
 * Falls back to console logging if no API key is provided.
 */
export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.PUBLIC_ORIGIN || 'https://persn.me'}/verify-email?token=${token}`;

  if (!resend) {
    console.warn('[mailer] Skipping email: RESEND_API_KEY not set.');
    console.log(`[mailer] To verify ${email}, visit: ${verifyUrl}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'persn.me <noreply@persn.me>',
      to: [email],
      subject: 'Vérifiez votre compte persn.me',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="margin-bottom: 32px; font-weight: 900; font-size: 20px; letter-spacing: 0.1em; color: rgba(255,255,255,0.4);">PERSN.ME</div>
          <h1 style="font-size: 28px; font-weight: 900; line-height: 1.1; margin-bottom: 16px;">Vérifiez votre email</h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
            Merci de vous être inscrit sur persn.me ! Pour activer votre compte et commencer à personnaliser votre profil, veuillez confirmer votre adresse email.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #ffffff; color: #000000; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Confirmer l'email</a>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.3);">
            Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[mailer] send error:', error);
    } else {
      console.log(`[mailer] Email sent to ${email} (id: ${data.id})`);
    }
  } catch (err) {
    console.error('[mailer] unexpected error:', err.message);
  }
}

/**
 * Sends a notification email when a user is banned.
 */
export async function sendBanEmail(email, reason) {
  if (!resend) {
    console.warn('[mailer] Skipping ban email: RESEND_API_KEY not set.');
    console.log(`[mailer] User ${email} banned for: ${reason || 'No reason specified'}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: 'persn.me <noreply@persn.me>',
      to: [email],
      subject: 'Information concernant votre compte persn.me',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="margin-bottom: 32px; font-weight: 900; font-size: 20px; letter-spacing: 0.1em; color: rgba(255,255,255,0.4);">PERSN.ME</div>
          <h1 style="font-size: 28px; font-weight: 900; line-height: 1.1; margin-bottom: 16px; color: #ff4444;">Compte suspendu</h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
            Nous vous informons que votre compte persn.me a été suspendu pour non-respect de nos conditions d'utilisation.
          </p>
          ${reason ? `
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 32px;">
            <div style="font-size: 12px; color: rgba(255,255,255,0.3); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Raison de la suspension :</div>
            <div style="color: #ffffff; font-size: 14px;">${reason}</div>
          </div>
          ` : ''}
          <p style="color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.6;">
            Cette décision est définitive. Si vous pensez qu'il s'agit d'une erreur, vous pouvez répondre à ce mail pour contacter le support.
          </p>
        </div>
      `,
    });

    if (error) console.error('[mailer] ban email error:', error);
  } catch (err) {
    console.error('[mailer] unexpected ban email error:', err.message);
  }
}
