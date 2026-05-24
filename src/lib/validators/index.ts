import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  name: z.string().min(2, "Nom requis").max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createPaymentSchema = z.object({
  amount: z.number().int().min(100, "Minimum 1€").max(99999900, "Maximum 999 999€"),
  receiverId: z.string().min(1),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  paymentMethod: z.enum(["card", "apple_pay", "google_pay", "bank_transfer", "open_banking"]).default("card"),
  idempotencyKey: z.string().max(64).optional(),
});

export const openBankingCreateSchema = z.object({
  amount: z.number().int().min(100).max(99999900),
  receiverId: z.string().min(1),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  bankId: z.string().optional(),
  description: z.string().max(500).optional(),
});

export const applePaySessionSchema = z.object({
  validationUrl: z.string().url(),
});

export const applePayPaymentSchema = z.object({
  receiverId: z.string().min(1),
  amount: z.number().int().min(100).max(99999900),
  paymentToken: z.unknown(),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const requestPayoutSchema = z.object({
  amount: z.number().int().min(100),
  bankAccountId: z.string().min(1),
});

export const addBankAccountSchema = z.object({
  iban: z.string().min(15).max(34).regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/i, "Format IBAN invalide"),
  holderName: z.string().min(2).max(100),
  bic: z.string().min(8).max(11).optional(),
});
