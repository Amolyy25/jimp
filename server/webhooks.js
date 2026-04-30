/**
 * Discord Webhook integration for real-time moderation alerts.
 */

const WEBHOOK_URL = process.env.DISCORD_MOD_WEBHOOK || 'https://discord.com/api/webhooks/1499449156232675518/7DgK-BGKfzOvjhPcKwF-i9MokwbOHIt6XwtW-0OrZG7BYXBSEKNzMWe7yMZY6E1X-Xy7';

async function sendToDiscord(embed) {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          color: 0x5865F2,
          timestamp: new Date().toISOString(),
          ...embed
        }]
      })
    });
  } catch (err) {
    console.error('[webhook] failed to send:', err.message);
  }
}

/**
 * Notify when a profile is reported.
 */
export async function notifyReport(slug, reason, details, ip) {
  await sendToDiscord({
    title: '🚨 NOUVEAU SIGNALEMENT',
    description: `Le profil **persn.me/${slug}** a été signalé.`,
    color: 0xff4444,
    fields: [
      { name: 'Raison', value: reason, inline: true },
      { name: 'IP du rapporteur', value: ip || 'Inconnue', inline: true },
      { name: 'Détails', value: details || '*Aucun détail supplémentaire*' }
    ],
    url: `https://persn.me/${slug}`
  });
}

/**
 * Notify when a new user registers.
 */
export async function notifyNewUser(username, email, method = 'Email') {
  await sendToDiscord({
    title: '✨ NOUVEL UTILISATEUR',
    description: `Un nouveau membre vient de nous rejoindre !`,
    color: 0x22c55e,
    fields: [
      { name: 'Nom d\'utilisateur', value: username, inline: true },
      { name: 'Méthode', value: method, inline: true }
    ]
  });
}
