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
  OpenBankingProvider,
  OpenBankingInitRequest,
  OpenBankingInitResult,
  OpenBankingStatusResult,
  BankInfo,
  ApplePayProvider,
  ApplePaySessionRequest,
  ApplePaySessionResult,
  ApplePayPaymentRequest,
  ApplePayPaymentResult,
} from "@/types/payments";

function uid(prefix = "mock") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export class MockPaymentProvider implements PaymentProvider {
  name = "mock";

  async createWallet(_userId: string): Promise<CreateWalletResult> {
    return { providerWalletId: uid("wal") };
  }

  async createPayin(req: PayinRequest): Promise<PayinResult> {
    if (req.method === "bank_transfer" || req.method === "open_banking") {
      return { providerTxId: uid("tx"), status: "pending", redirectUrl: req.returnUrl };
    }
    return { providerTxId: uid("tx"), status: "succeeded" };
  }

  async createPayout(_req: PayoutRequest): Promise<PayoutResult> {
    return { providerPayoutId: uid("po"), status: "succeeded" };
  }

  async registerBankAccount(_req: RegisterBankAccountRequest): Promise<RegisterBankAccountResult> {
    return { providerBankId: uid("ba"), status: "verified" };
  }

  async refund(_req: RefundRequest): Promise<RefundResult> {
    return { providerRefundId: uid("rf"), status: "succeeded" };
  }

  async verifyWebhook(_headers: Record<string, string>, _body: string): Promise<WebhookVerification> {
    if (process.env.NODE_ENV === "production") {
      console.error("MockPaymentProvider used in production — rejecting webhook");
      return { isValid: false };
    }
    return { isValid: true, eventType: "payment.succeeded", eventId: uid("evt") };
  }
}

export class MockOpenBankingProvider implements OpenBankingProvider {
  name = "mock-openbanking";

  async initPayment(req: OpenBankingInitRequest): Promise<OpenBankingInitResult> {
    const sessionId = uid("obs");
    const baseUrl = req.redirectUrl.split("/api/")[0];
    return {
      sessionId,
      authorizationUrl: `${baseUrl}/bank-auth?session=${sessionId}&amount=${req.amount}&bank=${req.bankId || "generic"}`,
      status: "initiated",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async getPaymentStatus(sessionId: string): Promise<OpenBankingStatusResult> {
    return {
      sessionId,
      status: "succeeded",
      providerTransactionId: uid("obtx"),
    };
  }

  async listBanks(_country?: string): Promise<BankInfo[]> {
    return [
      { id: "bnp_paribas", name: "BNP Paribas", country: "FR" },
      { id: "societe_generale", name: "Société Générale", country: "FR" },
      { id: "credit_agricole", name: "Crédit Agricole", country: "FR" },
      { id: "la_banque_postale", name: "La Banque Postale", country: "FR" },
      { id: "credit_mutuel", name: "Crédit Mutuel", country: "FR" },
      { id: "boursorama", name: "Boursorama", country: "FR" },
      { id: "ing", name: "ING", country: "FR" },
      { id: "revolut", name: "Revolut", country: "FR" },
    ];
  }

  async verifyWebhook(_headers: Record<string, string>, _body: string): Promise<WebhookVerification> {
    return { isValid: true, eventType: "open_banking.payment.completed", eventId: uid("evt") };
  }
}

export class MockApplePayProvider implements ApplePayProvider {
  async createSession(_req: ApplePaySessionRequest): Promise<ApplePaySessionResult> {
    return {
      merchantSession: {
        epochTimestamp: Date.now(),
        expiresAt: Date.now() + 300000,
        merchantSessionIdentifier: uid("aps"),
        displayName: "Yourazz",
      },
    };
  }

  async processPayment(_req: ApplePayPaymentRequest): Promise<ApplePayPaymentResult> {
    return { providerTxId: uid("aptx"), status: "succeeded" };
  }
}
