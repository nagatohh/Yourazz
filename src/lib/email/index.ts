import { Resend } from "resend";
import { db } from "@/lib/db";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = "YouRazz <noreply@yourazz.xyz>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";
const LOGO_HTML = `<span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">You<span style="background:linear-gradient(135deg,#fb7185,#e11d48);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Razz</span></span><br/><span style="font-size:10px;font-weight:500;letter-spacing:3px;color:#71717a;text-transform:uppercase">Official 公式</span>`;

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
  const subject = "🔑 Votre accès exclusif YouRazz vous attend";

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
  const subject = "Confirmez votre adresse email – YouRazz";

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
  const subject = `✓ Paiement confirmé – Commande #${orderId}`;

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: receiptTemplate(receipt),
  });

  await logEmail(email, subject, "receipt", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendPaymentFailedEmail(email: string, details: {
  amount: number;
  currency: string;
  transactionId: string;
  reason?: string;
  date: Date;
}) {
  const orderId = details.transactionId.slice(-8).toUpperCase();
  const subject = `Paiement échoué – Commande #${orderId}`;

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: paymentFailedTemplate(details),
  });

  await logEmail(email, subject, "payment_failed", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  const subject = "Réinitialisation de votre mot de passe – YouRazz";

  const { data, error } = await sendWithRetry({
    from: FROM,
    to: email,
    subject,
    html: passwordResetTemplate(name || email, url),
  });

  await logEmail(email, subject, "password_reset", { id: data?.id, error: error?.message });
  return { success: !error };
}

// ─────────────────────────────────────────────────────────────────────────────
// YOURAZZ PREMIUM EMAIL TEMPLATES
// Style: Cyber/luxe japonais, fond noir, accents rouges lumineux
// ─────────────────────────────────────────────────────────────────────────────

function baseLayout(content: string, preheader?: string) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>YouRazz Official</title>
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
    .container { width: 100% !important; padding: 12px !important; }
    .content { padding: 28px 20px !important; }
    .header { padding: 28px 20px 0 !important; }
    .footer { padding: 20px 20px !important; }
    .btn { padding: 16px 28px !important; font-size: 15px !important; }
    .receipt-table td { padding: 12px 16px !important; }
    h1 { font-size: 22px !important; }
    .amount-display { font-size: 32px !important; }
    .logo-img { height: 40px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#04040a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale">
${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${preheader}</div>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#04040a">
<tr><td align="center" style="padding:40px 16px">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px" class="container">

<!-- Logo Header -->
<tr><td align="center" style="padding:0 0 36px 0" class="header">
<a href="${BASE_URL}" target="_blank" style="text-decoration:none;display:inline-block">
${LOGO_HTML}
</a>
</td></tr>

<!-- Red accent line -->
<tr><td align="center" style="padding:0 0 32px">
<div style="width:60px;height:2px;background:linear-gradient(90deg,#e11d48,#be123c);border-radius:2px"></div>
</td></tr>

<!-- Main Card -->
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a12;border:1px solid rgba(225,29,72,0.1);border-radius:20px;overflow:hidden;box-shadow:0 0 60px -20px rgba(225,29,72,0.15)">
<!-- Top glow border -->
<tr><td style="height:2px;background:linear-gradient(90deg,transparent,#e11d48,transparent)"></td></tr>
<tr><td style="padding:44px 40px 40px" class="content">
${content}
</td></tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 40px;text-align:center" class="footer">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding-bottom:16px">
<div style="width:30px;height:1px;background:linear-gradient(90deg,transparent,rgba(225,29,72,0.3),transparent)"></div>
</td></tr>
<tr><td align="center">
<p style="margin:0 0 6px;font-size:12px;color:#52525b;line-height:1.5;font-weight:500">
YouRazz Official 公式
</p>
<p style="margin:0 0 12px;font-size:11px;color:#3f3f46;line-height:1.5">
Plateforme de paiement premium sécurisée
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
<tr>
<td style="padding:0 8px"><a href="${BASE_URL}" style="color:#71717a;font-size:11px;text-decoration:none;transition:color 0.2s">Site web</a></td>
<td style="color:#27272a;font-size:11px">•</td>
<td style="padding:0 8px"><a href="mailto:support@yourazz.xyz" style="color:#71717a;font-size:11px;text-decoration:none">Support</a></td>
<td style="color:#27272a;font-size:11px">•</td>
<td style="padding:0 8px"><a href="${BASE_URL}/legal" style="color:#71717a;font-size:11px;text-decoration:none">Mentions légales</a></td>
</tr>
</table>
<p style="margin:16px 0 0;font-size:10px;color:#1c1c1e">
© ${new Date().getFullYear()} YouRazz Official. Tous droits réservés.
</p>
</td></tr>
</table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
<tr><td align="center" style="border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#9f1239 100%)" bgcolor="#e11d48">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:54px;v-text-anchor:middle;width:260px" arcsize="26%" fillcolor="#e11d48" stroke="f">
<w:anchorlock/>
<center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${url}" target="_blank" style="display:inline-block;padding:17px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;background:linear-gradient(135deg,#e11d48 0%,#9f1239 100%);box-shadow:0 8px 24px rgba(225,29,72,0.35),0 0 0 1px rgba(225,29,72,0.15);letter-spacing:-0.2px" class="btn">${text}</a>
<!--<![endif]-->
</td></tr>
</table>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:28px 0"><div style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(225,29,72,0.12) 50%,transparent 100%)"></div></td></tr>
</table>`;
}

function securityNotice(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
<tr><td style="background:rgba(225,29,72,0.03);border:1px solid rgba(225,29,72,0.08);border-radius:14px;padding:18px 22px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="vertical-align:top;padding-right:14px">
<div style="width:24px;height:24px;background:rgba(225,29,72,0.1);border-radius:8px;text-align:center;line-height:24px">
<span style="font-size:12px;line-height:24px">🔒</span>
</div>
</td>
<td style="vertical-align:top">
<p style="margin:0;font-size:12px;color:#71717a;line-height:1.6">${text}</p>
</td>
</tr>
</table>
</td></tr>
</table>`;
}

function premiumBadge(text: string) {
  return `<div style="text-align:center;margin:0 0 24px">
<span style="display:inline-block;padding:6px 14px;background:rgba(225,29,72,0.08);border:1px solid rgba(225,29,72,0.15);border-radius:20px;font-size:11px;font-weight:600;color:#fb7185;letter-spacing:0.5px;text-transform:uppercase">${text}</span>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INVITATION / ACCOUNT CREATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function invitationTemplate(email: string, url: string, inviterName: string) {
  return baseLayout(`
${premiumBadge("Accès exclusif")}

<h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.2">
Bienvenue dans l'univers<br/>YouRazz
</h1>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Votre accès privilégié a été approuvé
</p>

<p style="margin:0 0 10px;font-size:15px;color:#e4e4e7;line-height:1.8;text-align:center">
<strong style="color:#ffffff">${inviterName}</strong> vous a personnellement invité à rejoindre la plateforme de paiement la plus exclusive.
</p>
<p style="margin:0 0 36px;font-size:14px;color:#a1a1aa;line-height:1.7;text-align:center">
Finalisez votre inscription pour accéder à votre espace privé et commencer à recevoir des paiements en toute sécurité.
</p>

${ctaButton("Créer mon compte", url)}

${divider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${["Connexion sécurisée avec chiffrement de bout en bout", "Votre mot de passe est haché et jamais stocké en clair", "Ce lien est unique, à usage exclusif et expire sous 72h"].map(t => `<tr>
<td style="padding:6px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:12px;vertical-align:middle"><span style="display:inline-block;width:18px;height:18px;background:rgba(225,29,72,0.1);border-radius:50%;text-align:center;line-height:18px;font-size:10px;color:#e11d48">✓</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.5">${t}</td>
</tr>
</table>
</td>
</tr>`).join("")}
</table>

${securityNotice("Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité. Aucune action ne sera effectuée sans votre consentement.")}
`, "Votre accès exclusif à YouRazz a été approuvé. Créez votre compte maintenant.");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFICATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function verificationTemplate(name: string, url: string) {
  return baseLayout(`
${premiumBadge("Vérification")}

<h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.2">
Confirmez votre email
</h1>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Dernière étape pour activer votre accès premium
</p>

<p style="margin:0 0 10px;font-size:15px;color:#e4e4e7;line-height:1.8;text-align:center">
Bonjour <strong style="color:#ffffff">${name}</strong>,
</p>
<p style="margin:0 0 36px;font-size:14px;color:#a1a1aa;line-height:1.7;text-align:center">
Confirmez votre adresse email pour activer votre compte YouRazz et débloquer toutes les fonctionnalités de votre espace privé.
</p>

${ctaButton("Confirmer mon email", url)}

${securityNotice("Ce lien de confirmation expire dans 24 heures. Si vous n'avez pas créé de compte sur YouRazz, ignorez simplement cet email.")}
`, "Confirmez votre adresse email pour activer votre compte YouRazz premium.");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PAYMENT RECEIPT EMAIL
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
<!-- Success indicator -->
<div style="text-align:center;margin:0 0 24px">
<div style="display:inline-block;width:60px;height:60px;background:linear-gradient(135deg,rgba(52,211,153,0.15),rgba(52,211,153,0.05));border:1px solid rgba(52,211,153,0.2);border-radius:50%;line-height:60px;text-align:center">
<span style="font-size:28px;line-height:60px">✓</span>
</div>
</div>

${premiumBadge("Paiement confirmé")}

<h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.2">
Transaction réussie
</h1>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Votre paiement a été traité avec succès
</p>

<!-- Amount display premium -->
<div style="text-align:center;margin:0 0 32px;padding:28px;background:linear-gradient(135deg,rgba(225,29,72,0.05),rgba(225,29,72,0.02));border:1px solid rgba(225,29,72,0.1);border-radius:18px">
<p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px">Montant payé</p>
<p style="margin:0;font-size:40px;font-weight:900;color:#ffffff;letter-spacing:-1.5px" class="amount-display">${amountFmt}</p>
</div>

<!-- Receipt details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden" class="receipt-table">
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Référence</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'SF Mono',SFMono-Regular,Menlo,monospace">#${orderId}</td>
</tr>
${receipt.payerName ? `<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Client</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.04)">${receipt.payerName}</td>
</tr>` : ""}
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Date</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${dateFmt} à ${timeFmt}</td>
</tr>
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Méthode</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${methodDisplay}</td>
</tr>
${receipt.description ? `<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Description</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${receipt.description}</td>
</tr>` : ""}
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a">Statut</td>
<td style="padding:16px 22px;font-size:13px;text-align:right">
<span style="display:inline-block;padding:5px 12px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.15);color:#34d399;font-size:12px;font-weight:700;border-radius:8px;letter-spacing:0.3px">Payé</span>
</td>
</tr>
</table>

<div style="margin-top:32px">
${ctaButton("Voir mes transactions", orderUrl)}
</div>

${securityNotice("Ce reçu confirme que votre paiement a été traité et vérifié par notre système sécurisé. Conservez cet email comme justificatif de paiement.")}
`, `Paiement de ${amountFmt} confirmé – Commande #${orderId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYMENT FAILED EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function paymentFailedTemplate(details: { amount: number; currency: string; transactionId: string; reason?: string; date: Date }) {
  const amountFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: details.currency }).format(details.amount / 100);
  const orderId = details.transactionId.slice(-8).toUpperCase();
  const dateFmt = details.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const retryUrl = `${BASE_URL}/dashboard/transactions`;

  const reasonLabels: Record<string, string> = {
    insufficient_funds: "Fonds insuffisants",
    card_declined: "Carte refusée",
    expired_card: "Carte expirée",
    processing_error: "Erreur de traitement",
    authentication_failed: "Authentification échouée",
  };
  const reasonDisplay = reasonLabels[details.reason || ""] || details.reason || "Erreur de traitement";

  return baseLayout(`
<!-- Error indicator -->
<div style="text-align:center;margin:0 0 24px">
<div style="display:inline-block;width:60px;height:60px;background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05));border:1px solid rgba(239,68,68,0.2);border-radius:50%;line-height:60px;text-align:center">
<span style="font-size:28px;line-height:60px">✕</span>
</div>
</div>

${premiumBadge("Paiement échoué")}

<h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.2">
Paiement non abouti
</h1>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
La transaction n'a pas pu être finalisée
</p>

<!-- Amount display -->
<div style="text-align:center;margin:0 0 32px;padding:28px;background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.1);border-radius:18px">
<p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px">Montant</p>
<p style="margin:0;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;opacity:0.7">${amountFmt}</p>
</div>

<!-- Details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden">
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Référence</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.04);font-family:monospace">#${orderId}</td>
</tr>
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Date</td>
<td style="padding:16px 22px;font-size:13px;color:#ffffff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04)">${dateFmt}</td>
</tr>
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a;border-bottom:1px solid rgba(255,255,255,0.04)">Raison</td>
<td style="padding:16px 22px;font-size:13px;color:#f87171;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04)">${reasonDisplay}</td>
</tr>
<tr>
<td style="padding:16px 22px;font-size:13px;color:#71717a">Statut</td>
<td style="padding:16px 22px;font-size:13px;text-align:right">
<span style="display:inline-block;padding:5px 12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.15);color:#f87171;font-size:12px;font-weight:700;border-radius:8px">Échoué</span>
</td>
</tr>
</table>

<p style="margin:28px 0;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.7">
Vérifiez vos informations de paiement et réessayez. Si le problème persiste, contactez votre banque ou notre support.
</p>

${ctaButton("Réessayer le paiement", retryUrl)}

${securityNotice("Aucun montant n'a été débité de votre compte. Si vous constatez un débit suspect, contactez immédiatement notre support à support@yourazz.xyz")}
`, `Paiement de ${amountFmt} échoué – Commande #${orderId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function passwordResetTemplate(name: string, url: string) {
  return baseLayout(`
${premiumBadge("Sécurité")}

<h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;line-height:1.2">
Réinitialisation du<br/>mot de passe
</h1>
<p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Sécurisez votre compte en quelques secondes
</p>

<p style="margin:0 0 10px;font-size:15px;color:#e4e4e7;line-height:1.8;text-align:center">
Bonjour <strong style="color:#ffffff">${name}</strong>,
</p>
<p style="margin:0 0 36px;font-size:14px;color:#a1a1aa;line-height:1.7;text-align:center">
Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
</p>

${ctaButton("Réinitialiser mon mot de passe", url)}

${divider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding:6px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:12px;vertical-align:middle"><span style="display:inline-block;width:18px;height:18px;background:rgba(225,29,72,0.1);border-radius:50%;text-align:center;line-height:18px;font-size:10px;color:#e11d48">!</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.5">Ce lien expire dans <strong style="color:#e4e4e7">1 heure</strong></td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:6px 0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding-right:12px;vertical-align:middle"><span style="display:inline-block;width:18px;height:18px;background:rgba(225,29,72,0.1);border-radius:50%;text-align:center;line-height:18px;font-size:10px;color:#e11d48">!</span></td>
<td style="font-size:13px;color:#71717a;line-height:1.5">Utilisable une seule fois</td>
</tr>
</table>
</td>
</tr>
</table>

${securityNotice("Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel restera inchangé. Si vous pensez que votre compte est compromis, contactez-nous immédiatement.")}
`, "Réinitialisez votre mot de passe YouRazz. Ce lien expire dans 1 heure.");
}
