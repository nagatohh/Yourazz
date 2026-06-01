export interface PayinRequest {
  walletId: string;
  amount: number;
  currency?: string;
  method: string;
  returnUrl: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface PayinResult {
  providerTxId: string;
  status: "succeeded" | "pending" | "authorized" | "failed";
  redirectUrl?: string;
}

export interface PayoutRequest {
  walletId: string;
  bankAccountId: string;
  amount: number;
  currency?: string;
  reference?: string;
}

export interface PayoutResult {
  providerPayoutId: string;
  status: "succeeded" | "processing" | "failed";
  estimatedArrival?: Date;
}

export interface RegisterBankAccountRequest {
  userId: string;
  iban: string;
  holderName: string;
  bic?: string;
  country?: string;
}

export interface RegisterBankAccountResult {
  providerBankId: string;
  status: "verified" | "pending";
}

export interface RefundRequest {
  providerTxId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: "succeeded" | "pending" | "failed";
}

export interface WebhookVerification {
  isValid: boolean;
  eventType?: string;
  eventId?: string;
  payload?: unknown;
}

export interface CreateWalletResult {
  providerWalletId: string;
}

export interface PaymentProvider {
  name: string;
  createWallet(userId: string): Promise<CreateWalletResult>;
  createPayin(req: PayinRequest): Promise<PayinResult>;
  createPayout(req: PayoutRequest): Promise<PayoutResult>;
  registerBankAccount(req: RegisterBankAccountRequest): Promise<RegisterBankAccountResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
  verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookVerification>;
}

export interface OpenBankingInitRequest {
  amount: number;
  currency?: string;
  payerName?: string;
  payerEmail?: string;
  bankId?: string;
  redirectUrl: string;
  reference?: string;
  metadata?: Record<string, string>;
}

export interface OpenBankingInitResult {
  sessionId: string;
  authorizationUrl: string;
  status: "initiated" | "failed";
  expiresAt?: Date;
}

export interface OpenBankingStatusResult {
  sessionId: string;
  status: "initiated" | "redirected" | "authorized" | "succeeded" | "failed" | "cancelled" | "expired";
  providerTransactionId?: string;
  errorMessage?: string;
}

export interface BankInfo {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
}

export interface OpenBankingProvider {
  name: string;
  initPayment(req: OpenBankingInitRequest): Promise<OpenBankingInitResult>;
  getPaymentStatus(sessionId: string): Promise<OpenBankingStatusResult>;
  listBanks(country?: string): Promise<BankInfo[]>;
  verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookVerification>;
}

export interface ApplePaySessionRequest {
  validationUrl: string;
  displayName: string;
  domainName: string;
}

export interface ApplePaySessionResult {
  merchantSession: unknown;
}

export interface ApplePayPaymentRequest {
  walletId: string;
  amount: number;
  currency?: string;
  paymentToken: unknown;
  metadata?: Record<string, string>;
}

export interface ApplePayPaymentResult {
  providerTxId: string;
  status: "succeeded" | "pending" | "failed";
}

export interface ApplePayProvider {
  createSession(req: ApplePaySessionRequest): Promise<ApplePaySessionResult>;
  processPayment(req: ApplePayPaymentRequest): Promise<ApplePayPaymentResult>;
}
