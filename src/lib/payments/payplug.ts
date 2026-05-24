import type {
  PaymentProvider,
  PayinRequest,
  PayinResult,
  PayoutRequest,
  PayoutResult,
  RegisterBankAccountRequest,
  RegisterBankAccountResult,
  RefundRequest,
  RefundResult,
  CreateWalletResult,
  WebhookVerification,
  ApplePayProvider,
  ApplePaySessionRequest,
  ApplePaySessionResult,
  ApplePayPaymentRequest,
  ApplePayPaymentResult,
} from "@/types/payments";
import { createVerify } from "crypto";

const PAYPLUG_API = "https://api.payplug.com/v1";

async function payplugFetch(path: string, options: RequestInit = {}) {
  const key = process.env.PAYPLUG_SECRET_KEY;
  if (!key) throw new Error("PAYPLUG_SECRET_KEY manquante");

  const res = await fetch(`${PAYPLUG_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "PayPlug-Version": "2019-08-06",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PayPlug API ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}

export class PayPlugProvider implements PaymentProvider {
  name = "payplug";

  async createWallet(userId: string): Promise<CreateWalletResult> {
    // PayPlug n'a pas de concept de wallet — les fonds vont directement sur le compte marchand
    return { providerWalletId: `payplug_${userId}` };
  }

  async createPayin(req: PayinRequest): Promise<PayinResult> {
    const payload: any = {
      amount: req.amount,
      currency: (req.currency || "EUR").toUpperCase(),
      billing: {
        first_name: req.metadata?.payerName?.split(" ")[0] || "Client",
        last_name: req.metadata?.payerName?.split(" ").slice(1).join(" ") || "Yourazz",
        email: req.metadata?.payerEmail || undefined,
      },
      shipping: {
        delivery_type: "DIGITAL_GOODS",
      },
      hosted_payment: {
        return_url: req.returnUrl,
        cancel_url: req.cancelUrl || req.returnUrl.replace("success", "failed"),
      },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment-provider`,
      metadata: {
        ...req.metadata,
        idempotency_key: req.idempotencyKey,
      },
    };

    // Apple Pay: utilise payment_method pour forcer le type
    if (req.method === "apple_pay") {
      payload.payment_method = "apple_pay";
      payload.initiator = "PAYER";
    }

    const result = await payplugFetch("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    let status: PayinResult["status"] = "pending";
    if (result.is_paid) status = "succeeded";
    else if (result.failure) status = "failed";

    return {
      providerTxId: result.id,
      status,
      redirectUrl: result.hosted_payment?.payment_url,
    };
  }

  async createPayout(_req: PayoutRequest): Promise<PayoutResult> {
    // PayPlug gère les virements automatiquement vers le compte bancaire du marchand
    // Les fonds sont transférés selon le calendrier configuré (J+1, J+2, etc.)
    // Pas d'API de payout manuel — les fonds arrivent automatiquement sur l'IBAN du marchand
    return {
      providerPayoutId: `payout_auto_${Date.now()}`,
      status: "processing",
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // J+2
    };
  }

  async registerBankAccount(_req: RegisterBankAccountRequest): Promise<RegisterBankAccountResult> {
    // Le compte bancaire est configuré dans le dashboard PayPlug, pas via API
    return { providerBankId: "payplug_merchant_account", status: "verified" };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    const payload: any = {};
    if (req.amount) payload.amount = req.amount;
    if (req.reason) payload.metadata = { reason: req.reason };

    const result = await payplugFetch(`/payments/${req.providerTxId}/refunds`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      providerRefundId: result.id,
      status: result.is_paid !== false ? "succeeded" : "pending",
    };
  }

  async verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookVerification> {
    // PayPlug signe les webhooks avec RSA-SHA256
    // La clé publique est fournie dans le header ou via l'API
    const signature = headers["x-payplug-signature"] || headers["payplug-signature"] || "";

    if (!signature) {
      return { isValid: false };
    }

    try {
      const publicKey = process.env.PAYPLUG_PUBLIC_KEY;
      if (!publicKey) {
        console.error("PAYPLUG_PUBLIC_KEY missing — rejecting webhook");
        return { isValid: false };
      }

      const verifier = createVerify("RSA-SHA256");
      verifier.update(body);
      const isValid = verifier.verify(publicKey, signature, "base64");

      if (!isValid) return { isValid: false };

      const payload = JSON.parse(body);
      return {
        isValid: true,
        eventType: payload.is_paid ? "payment.succeeded" : "payment.failed",
        eventId: payload.id,
        payload,
      };
    } catch {
      return { isValid: false };
    }
  }
}

export class PayPlugApplePayProvider implements ApplePayProvider {
  async createSession(req: ApplePaySessionRequest): Promise<ApplePaySessionResult> {
    // PayPlug gère Apple Pay via la Payment Request API W3C
    // Le merchant session est validé côté PayPlug
    const result = await payplugFetch("/apple-pay/sessions", {
      method: "POST",
      body: JSON.stringify({
        validation_url: req.validationUrl,
        display_name: req.displayName,
        domain_name: req.domainName,
      }),
    });

    return { merchantSession: result };
  }

  async processPayment(req: ApplePayPaymentRequest): Promise<ApplePayPaymentResult> {
    // Créer un paiement PayPlug avec le token Apple Pay
    const payload = {
      amount: req.amount,
      currency: (req.currency || "EUR").toUpperCase(),
      payment_method: "apple_pay",
      apple_pay_token: req.paymentToken,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment-provider`,
      metadata: req.metadata,
    };

    const result = await payplugFetch("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      providerTxId: result.id,
      status: result.is_paid ? "succeeded" : "pending",
    };
  }
}
