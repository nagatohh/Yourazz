import { Resend } from "resend";
import { db } from "@/lib/db";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = "Yourazz <noreply@yourazz.xyz>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";

async function logEmail(toEmail: string, subject: string, template: string, result: { id?: string; error?: string }) {
  try {
    await db.emailLog.create({
      data: {
        toEmail,
        subject,
        template,
        status: result.error ? "FAILED" : "SENT",
        providerMessageId: result.id || null,
        errorMessage: result.error || null,
      },
    });
  } catch (e) {
    console.error("EMAIL_LOG_ERROR:", e);
  }
}

async function sendWithRetry(params: { from: string; to: string; subject: string; html: string }, retries = 2) {
  let lastError: string | undefined;
  for (let i = 0; i <= retries; i++) {
    const { data, error } = await getResend().emails.send(params);
    if (!error) return { data, error: null };
    lastError = error.message;
    if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return { data: null, error: { message: lastError } };
}

export async function sendInvitationEmail(email: string, token: string, inviterName: string) {
  const url = `${BASE_URL}/register/invite?token=${token}`;
  const subject = "Bienvenue sur Yourazz – Finalisez votre compte";

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: invitationTemplate(email, url, inviterName),
  });

  await logEmail(email, subject, "invitation", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  const subject = "Confirmez votre adresse email – Yourazz";

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: verificationTemplate(name || email, url),
  });

  await logEmail(email, subject, "verification", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendPaymentReceipt(email: string, receipt: {
  amount: number;
  currency: string;
  transactionId: string;
  payerName?: string;
  description?: string;
  paymentMethod?: string;
  date: Date;
}) {
  const orderId = receipt.transactionId.slice(-8).toUpperCase();
  const subject = `Confirmation de paiement – Commande #${orderId}`;

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: receiptTemplate(receipt),
  });

  await logEmail(email, subject, "receipt", { id: data?.id, error: error?.message });
  return { success: !error };
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

function baseLayout(content: string, preheader?: string) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Yourazz</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style type="text/css">
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; padding: 16px !important; }
    .content { padding: 32px 24px !important; }
    .header { padding: 24px 24px 0 !important; }
    .footer { padding: 20px 24px !important; }
    .btn { padding: 16px 24px !important; font-size: 15px !important; }
    .receipt-table td { padding: 12px 16px !important; }
    h1 { font-size: 24px !important; }
    .amount-display { font-size: 32px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #06060a !important; }
    .email-card { background-color: #0f0f14 !important; border-color: rgba(255,255,255,0.08) !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#06060a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale" class="email-body">
${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${preheader}</div>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060a">
<tr><td align="center" style="padding:40px 16px">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px" class="container">

<!-- Logo Header -->
<tr><td align="center" style="padding:0 0 32px 0" class="header">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:linear-gradient(135deg,#e11d48 0%,#be123c 100%);width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:44px;v-text-anchor:middle;width:44px" arcsize="27%" fillcolor="#e11d48" stroke="f">
<w:anchorlock/>
<center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold">Y</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<span style="color:#ffffff;font-size:18px;font-weight:700;line-height:44px;display:inline-block">Y</span>
<!--<![endif]-->
</td></tr>
</table>
<p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Yourazz</p>
</td></tr>

<!-- Main Card -->
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f14;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden" class="email-card">
<tr><td style="padding:40px 40px 36px" class="content">
${content}
</td></tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:28px 40px;text-align:center" class="footer">
<p style="margin:0 0 6px;font-size:12px;color:#52525b;line-height:1.5">
Yourazz – Plateforme de paiement sécurisée
</p>
<p style="margin:0 0 12px;font-size:11px;color:#3f3f46;line-height:1.5">
Cet email a été envoyé automatiquement. Ne pas répondre à ce message.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
<tr>
<td style="padding:0 8px"><a href="${BASE_URL}" style="color:#71717a;font-size:11px;text-decoration:none">Site web</a></td>
<td style="color:#3f3f46;font-size:11px">•</td>
<td style="padding:0 8px"><a href="mailto:support@yourazz.xyz" style="color:#71717a;font-size:11px;text-decoration:none">Support</a></td>
<td style="color:#3f3f46;font-size:11px">•</td>
<td style="padding:0 8px"><a href="${BASE_URL}/legal" style="color:#71717a;font-size:11px;text-decoration:none">Mentions légales</a></td>
</tr>
</table>
<p style="margin:16px 0 0;font-size:10px;color:#27272a">
© ${new Date().getFullYear()} Yourazz. Tous droits réservés.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
<tr><td align="center" style="border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#be123c 100%)" bgcolor="#e11d48">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:240px" arcsize="27%" fillcolor="#e11d48" stroke="f">
<w:anchorlock/>
<center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${url}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#be123c 100%);box-shadow:0 4px 14px rgba(225,29,72,0.25);letter-spacing:-0.2px" class="btn">${text}</a>
<!--<![endif]-->
</td></tr>
</table>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:24px 0"><div style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)"></div></td></tr>
</table>`;
}

function securityNotice(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">
<tr><td style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="vertical-align:top;padding-right:12px">
<span style="display:inline-block;width:20px;height:20px;background:rgba(225,29,72,0.1);border-radius:6px;text-align:center;line-height:20px;font-size:11px">🔒</span>
</td>
<td style="vertical-align:top">
<p style="margin:0;font-size:12px;color:#71717a;line-height:1.5">${text}</p>
</td>
</tr>
</table>
</td></tr>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITATION / ACCOUNT CREATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function invitationTemplate(email: string, url: string, inviterName: string) {
  return baseLayout(`
<!-- Title -->
<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.3">
Bienvenue sur Yourazz
</h1>
<p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Votre accès a été approuvé
</p>

<!-- Decorative line -->
<div style="text-align:center;margin:0 0 28px">
<div style="display:inline-block;width:40px;height:3px;background:linear-gradient(90deg,#e11d48,#be123c);border-radius:2px"></div>
</div>

<!-- Body text -->
<p style="margin:0 0 8px;font-size:15px;color:#e4e4e7;line-height:1.7;text-align:center">
<strong>${inviterName}</strong> vous a invité à rejoindre la plateforme Yourazz.
</p>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;line-height:1.7;text-align:center">
Cliquez sur le bouton ci-dessous pour finaliser la création de votre compte et commencer à recevoir des paiements en toute sécurité.
</p>

<!-- CTA Button -->
${ctaButton("Créer mon compte", url)}

<!-- Security info -->
${divider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding:4px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:10px;vertical-align:middle"><span style="color:#e11d48;font-size:13px">✓</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.4">Connexion sécurisée avec chiffrement de bout en bout</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:4px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:10px;vertical-align:middle"><span style="color:#e11d48;font-size:13px">✓</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.4">Votre mot de passe est haché et jamais stocké en clair</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:4px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:10px;vertical-align:middle"><span style="color:#e11d48;font-size:13px">✓</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.4">Ce lien est unique, à usage exclusif et expire sous 72h</td>
</tr>
</table>
</td>
</tr>
</table>

${securityNotice("Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité. Aucune action ne sera effectuée sans votre consentement.")}
`, "Votre accès à Yourazz a été approuvé. Finalisez votre compte maintenant.");
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function verificationTemplate(name: string, url: string) {
  return baseLayout(`
<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.3">
Confirmez votre email
</h1>
<p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Dernière étape pour activer votre compte
</p>

<div style="text-align:center;margin:0 0 28px">
<div style="display:inline-block;width:40px;height:3px;background:linear-gradient(90deg,#e11d48,#be123c);border-radius:2px"></div>
</div>

<p style="margin:0 0 8px;font-size:15px;color:#e4e4e7;line-height:1.7;text-align:center">
Bonjour <strong>${name}</strong>,
</p>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;line-height:1.7;text-align:center">
Confirmez votre adresse email pour activer votre compte Yourazz et accéder à toutes les fonctionnalités de la plateforme.
</p>

${ctaButton("Confirmer mon email", url)}

${securityNotice("Ce lien de confirmation expire dans 24 heures. Si vous n'avez pas créé de compte sur Yourazz, ignorez simplement cet email.")}
`, "Confirmez votre adresse email pour activer votre compte Yourazz.");
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT RECEIPT EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function receiptTemplate(receipt: { amount: number; currency: string; transactionId: string; payerName?: string; description?: string; paymentMethod?: string; date: Date }) {
  const amountFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: receipt.currency }).format(receipt.amount / 100);
  const dateFmt = receipt.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const timeFmt = receipt.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const orderId = receipt.transactionId.slice(-8).toUpperCase();
  const orderUrl = `${BASE_URL}/dashboard/transactions`;

  const methodLabels: Record<string, string> = {
    CARD: "Carte bancaire",
    APPLE_PAY: "Apple Pay",
    GOOGLE_PAY: "Google Pay",
    BANK_TRANSFER: "Virement bancaire",
    SEPA: "Prélèvement SEPA",
    OPEN_BANKING: "Open Banking",
  };
  const methodDisplay = methodLabels[receipt.paymentMethod || ""] || "Carte bancaire";

  return baseLayout(`
<!-- Success badge -->
<div style="text-align:center;margin:0 0 20px">
<div style="display:inline-block;width:56px;height:56px;background:rgba(52,211,153,0.1);border-radius:50%;line-height:56px;text-align:center">
<span style="font-size:26px;line-height:56px">✓</span>
</div>
</div>

<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.3">
Paiement confirmé
</h1>
<p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Votre transaction a été traitée avec succès
</p>

<!-- Amount display -->
<div style="text-align:center;margin:0 0 32px;padding:24px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px">
<p style="margin:0 0 4px;font-size:12px;font-weight:500;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">Montant payé</p>
<p style="margin:0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-1px" class="amount-display">${amountFmt}</p>
</div>

<!-- Receipt details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;overflow:hidden" class="receipt-table">
<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Référence</td>
<td style="padding:14px 20px;font-size:13px;color:#ffffff;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);font-family:monospace">#${orderId}</td>
</tr>
${receipt.payerName ? `<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Client</td>
<td style="padding:14px 20px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${receipt.payerName}</td>
</tr>` : ""}
<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Date</td>
<td style="padding:14px 20px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${dateFmt} à ${timeFmt}</td>
</tr>
<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Méthode</td>
<td style="padding:14px 20px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${methodDisplay}</td>
</tr>
${receipt.description ? `<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Description</td>
<td style="padding:14px 20px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${receipt.description}</td>
</tr>` : ""}
<tr>
<td style="padding:14px 20px;font-size:13px;color:#71717a">Statut</td>
<td style="padding:14px 20px;font-size:13px;text-align:right">
<span style="display:inline-block;padding:4px 10px;background:rgba(52,211,153,0.1);color:#34d399;font-size:12px;font-weight:600;border-radius:6px">Payé</span>
</td>
</tr>
</table>

<!-- CTA -->
<div style="margin-top:28px">
${ctaButton("Voir mes transactions", orderUrl)}
</div>

${securityNotice("Ce reçu confirme que votre paiement a été traité et vérifié par notre système. Conservez cet email comme justificatif.")}
`, `Paiement de ${amountFmt} confirmé – Commande #${orderId}`);
}
