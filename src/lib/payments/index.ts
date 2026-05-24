import type { PaymentProvider, OpenBankingProvider, ApplePayProvider } from "@/types/payments";
import { MockPaymentProvider, MockOpenBankingProvider, MockApplePayProvider } from "./mock";

let paymentInstance: PaymentProvider | null = null;
let openBankingInstance: OpenBankingProvider | null = null;
let applePayInstance: ApplePayProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!paymentInstance) {
    if (process.env.PAYMENT_PROVIDER === "stripe" && process.env.STRIPE_SECRET_KEY) {
      const { StripePaymentProvider } = require("./stripe") as typeof import("./stripe");
      paymentInstance = new StripePaymentProvider();
    } else if (process.env.PAYMENT_PROVIDER === "payplug" && process.env.PAYPLUG_SECRET_KEY) {
      const { PayPlugProvider } = require("./payplug") as typeof import("./payplug");
      paymentInstance = new PayPlugProvider();
    } else {
      paymentInstance = new MockPaymentProvider();
    }
  }
  return paymentInstance;
}

export function getOpenBankingProvider(): OpenBankingProvider {
  if (!openBankingInstance) {
    openBankingInstance = new MockOpenBankingProvider();
  }
  return openBankingInstance;
}

export function getApplePayProvider(): ApplePayProvider {
  if (!applePayInstance) {
    if (process.env.PAYMENT_PROVIDER === "payplug" && process.env.PAYPLUG_SECRET_KEY) {
      const { PayPlugApplePayProvider } = require("./payplug") as typeof import("./payplug");
      applePayInstance = new PayPlugApplePayProvider();
    } else {
      applePayInstance = new MockApplePayProvider();
    }
  }
  return applePayInstance;
}
