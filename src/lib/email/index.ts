import { Resend } from "resend";
import { db } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Yourazz <noreply@yourazz.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz-git-main-yourazz-s-projects.vercel.app";

async function logEmail(toEmail: string, subject: string, template: string, result: { id?: string; error?: string }) {
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
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  const subject = "Confirmez votre adresse email – Yourazz";

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: verificationTemplate(name || email, url),
  });

  await logEmail(email, subject, "verification", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendInvitationEmail(email: string, token: string, inviterName: string) {
  const url = `${BASE_URL}/register/invite?token=${token}`;
  const subject = "Vous êtes invité à rejoindre Yourazz";

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: invitationTemplate(email, url, inviterName),
  });

  await logEmail(email, subject, "invitation", { id: data?.id, error: error?.message });
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
  const subject = `Reçu de paiement – #${receipt.transactionId.slice(-8).toUpperCase()}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: receiptTemplate(receipt),
  });

  await logEmail(email, subject, "receipt", { id: data?.id, error: error?.message });
  return { success: !error };
}

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden">
<tr><td style="padding:32px 32px 0;text-align:center">
<div style="display:inline-block;width:40px;height:40px;background:linear-gradient(135deg,#e11d48,#be123c);border-radius:12px;line-height:40px;text-align:center">
<span style="color:#fff;font-weight:bold;font-size:16px">Y</span>
</div>
</td></tr>
<tr><td style="padding:24px 32px 32px">${content}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.04);text-align:center">
<p style="margin:0;font-size:12px;color:#52525b">Équipe Yourazz</p>
<p style="margin:4px 0 0;font-size:11px;color:#3f3f46">Plateforme de paiement sécurisée</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function verificationTemplate(name: string, url: string) {
  return baseLayout(`
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;text-align:center">Confirmez votre email</h1>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
Bonjour ${name},<br>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.
</p>
<div style="text-align:center;margin:0 0 24px">
<a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px">
Confirmer mon email
</a>
</div>
<p style="margin:0;font-size:12px;color:#52525b;text-align:center">Ce lien expire dans 24 heures.</p>
`);
}

function invitationTemplate(email: string, url: string, inviterName: string) {
  return baseLayout(`
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;text-align:center">Vous êtes invité</h1>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;text-align:center;line-height:1.6">
${inviterName} vous invite à rejoindre Yourazz.<br>Créez votre compte pour commencer à recevoir des paiements.
</p>
<div style="text-align:center;margin:0 0 24px">
<a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px">
Créer mon compte
</a>
</div>
<p style="margin:0;font-size:12px;color:#52525b;text-align:center">Cette invitation expire dans 72 heures.</p>
`);
}

function receiptTemplate(receipt: { amount: number; currency: string; transactionId: string; payerName?: string; description?: string; paymentMethod?: string; date: Date }) {
  const amountFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: receipt.currency }).format(receipt.amount / 100);
  const dateFmt = receipt.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const orderId = receipt.transactionId.slice(-8).toUpperCase();

  return baseLayout(`
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;text-align:center">Paiement confirmé</h1>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;text-align:center">Merci pour votre paiement. Voici votre reçu.</p>
<table width="100%" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Référence</td><td style="padding:8px 16px;font-size:13px;color:#fff;text-align:right;font-weight:600">#${orderId}</td></tr>
<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Montant</td><td style="padding:8px 16px;font-size:18px;color:#fff;text-align:right;font-weight:700">${amountFmt}</td></tr>
<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Date</td><td style="padding:8px 16px;font-size:13px;color:#fff;text-align:right">${dateFmt}</td></tr>
${receipt.paymentMethod ? `<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Méthode</td><td style="padding:8px 16px;font-size:13px;color:#fff;text-align:right">${receipt.paymentMethod}</td></tr>` : ""}
${receipt.description ? `<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Description</td><td style="padding:8px 16px;font-size:13px;color:#fff;text-align:right">${receipt.description}</td></tr>` : ""}
<tr><td style="padding:8px 16px;font-size:13px;color:#71717a">Statut</td><td style="padding:8px 16px;font-size:13px;color:#34d399;text-align:right;font-weight:600">Payé ✓</td></tr>
</table>
<p style="margin:24px 0 0;font-size:12px;color:#52525b;text-align:center">Pour toute question, contactez-nous à support@yourazz.com</p>
`);
}
