import { db } from "@/lib/db";

const FROM = process.env.EMAIL_FROM || "Yourazz <noreply@yourazz.xyz>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";

async function sendWithRetry(params: { from: string; to: string; subject: string; html: string }, retries = 2) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  let lastError: string | undefined;
  for (let i = 0; i <= retries; i++) {
    const { data, error } = await resend.emails.send(params);
    if (!error) return { data, error: null };
    lastError = error.message;
    if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return { data: null, error: { message: lastError } };
}

async function logEmail(toEmail: string, subject: string, template: string, result: { id?: string; error?: string }) {
  try {
    await db.emailLog.create({
      data: { toEmail, subject, template, status: result.error ? "FAILED" : "SENT", providerMessageId: result.id || null, errorMessage: result.error || null },
    });
  } catch {}
}

export async function sendPlanUpgradedEmail(email: string, plan: string) {
  const subject = `Votre plan Yourazz est maintenant ${plan}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#04040a;font-family:system-ui,sans-serif">
<div style="max-width:500px;margin:0 auto;background:#141416;border:1px solid rgba(220,38,38,0.1);border-radius:20px;padding:40px;text-align:center">
<div style="margin-bottom:24px"><span style="display:inline-block;padding:6px 14px;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.15);border-radius:20px;font-size:11px;font-weight:600;color:#f87171;text-transform:uppercase;letter-spacing:0.5px">Plan mis à jour</span></div>
<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fff">Bienvenue sur ${plan} !</h1>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6">Votre plan a été mis à jour avec succès. Vous avez maintenant accès à toutes les fonctionnalités ${plan}.</p>
<a href="${BASE_URL}/dashboard/plan" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px">Voir mon plan</a>
<p style="margin:24px 0 0;font-size:12px;color:#52525b">Yourazz · Paiements sécurisés</p>
</div></body></html>`;

  const { data, error } = await sendWithRetry({ from: FROM, to: email, subject, html });
  await logEmail(email, subject, "plan_upgraded", { id: data?.id, error: error?.message });
  return { success: !error };
}

export async function sendCryptoPaymentConfirmedEmail(email: string, details: { plan: string; key: string; reference?: string }) {
  const subject = `Paiement crypto confirmé — votre clé ${details.plan}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#04040a;font-family:system-ui,sans-serif">
<div style="max-width:500px;margin:0 auto;background:#141416;border:1px solid rgba(220,38,38,0.1);border-radius:20px;padding:40px;text-align:center">
<div style="margin-bottom:24px"><span style="display:inline-block;padding:6px 14px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.15);border-radius:20px;font-size:11px;font-weight:600;color:#34d399;text-transform:uppercase;letter-spacing:0.5px">Confirmé</span></div>
<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fff">Paiement crypto reçu</h1>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6">Votre paiement Litecoin${details.reference ? ` (réf: ${details.reference})` : ""} a été vérifié. Voici votre clé d'activation :</p>
<div style="margin:0 0 24px;padding:16px;background:#0a0a0a;border:1px solid rgba(52,211,153,0.2);border-radius:12px">
<code style="font-size:14px;color:#34d399;font-family:monospace;word-break:break-all">${details.key}</code>
</div>
<a href="${BASE_URL}/access/activate" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px">Activer mon plan</a>
<p style="margin:24px 0 0;font-size:12px;color:#52525b">Cette clé est à usage unique. Ne la partagez pas.</p>
</div></body></html>`;

  const { data, error } = await sendWithRetry({ from: FROM, to: email, subject, html });
  await logEmail(email, subject, "crypto_confirmed", { id: data?.id, error: error?.message });
  return { success: !error };
}
