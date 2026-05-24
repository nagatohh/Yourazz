import Stripe from "stripe";
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
} from "@/types/payments";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key);
}

export class StripePaymentProvider implements PaymentProvider {
  name = "stripe";

  async createWallet(userId: string): Promise<CreateWalletResult> {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      metadata: { userId },
    });
    return { providerWalletId: customer.id };
  }

  async createPayin(req: PayinRequest): Promise<PayinResult> {
    const stripe = getStripe();

    const paymentMethodTypes: string[] = ["card"];
    if (req.method === "apple_pay" || req.method === "google_pay") {
      // card covers Apple Pay and Google Pay via Stripe
    } else if (req.method === "bank_transfer" || req.method === "open_banking") {
      paymentMethodTypes.push("bancontact", "sepa_debit");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes as any,
      customer: req.walletId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: req.amount,
            product_data: { name: "Paiement YouRazz" },
          },
          quantity: 1,
        },
      ],
      success_url: req.returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: req.cancelUrl || req.returnUrl,
      metadata: {
        ...req.metadata,
        idempotencyKey: req.idempotencyKey || "",
      },
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    } as any);

    return {
      providerTxId: session.id,
      status: "pending",
      redirectUrl: session.url || undefined,
    };
  }

  async createPayout(req: PayoutRequest): Promise<PayoutResult> {
    const stripe = getStripe();

    const transfer = await stripe.transfers.create({
      amount: req.amount,
      currency: req.currency || "eur",
      destination: req.bankAccountId,
      description: req.reference || "Retrait YouRazz",
    });

    return {
      providerPayoutId: transfer.id,
      status: "processing",
    };
  }

  async registerBankAccount(req: RegisterBankAccountRequest): Promise<RegisterBankAccountResult> {
    const stripe = getStripe();

    const account = await stripe.accounts.create({
      type: "custom",
      country: "FR",
      capabilities: { transfers: { requested: true } },
      external_account: {
        object: "bank_account",
        country: "FR",
        currency: "eur",
        account_holder_name: req.holderName,
        account_number: req.iban,
      } as any,
      metadata: { userId: req.userId },
    });

    return {
      providerBankId: account.id,
      status: "pending",
    };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    const stripe = getStripe();

    const refund = await stripe.refunds.create({
      payment_intent: req.providerTxId,
      amount: req.amount,
      reason: "requested_by_customer" as any,
    });

    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookVerification> {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return { isValid: false };

    try {
      const sig = headers["stripe-signature"];
      if (!sig) return { isValid: false };

      const event = stripe.webhooks.constructEvent(body, sig, secret);

      const eventTypeMap: Record<string, string> = {
        "checkout.session.completed": "payment.succeeded",
        "checkout.session.expired": "payment.failed",
        "payment_intent.payment_failed": "payment.failed",
        "transfer.paid": "payout.paid",
        "transfer.failed": "payout.failed",
        "charge.dispute.created": "dispute.created",
        "charge.refunded": "refund.created",
      };
      const eventType = eventTypeMap[event.type] || event.type;

      const obj = event.data.object as any;

      return {
        isValid: true,
        eventType,
        eventId: event.id,
        payload: { id: obj.payment_intent || obj.id, ...obj },
      };
    } catch {
      return { isValid: false };
    }
  }
}
