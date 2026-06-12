import { db } from "@/lib/db";

export type NotificationType =
  | "PAYMENT_RECEIVED"
  | "PAYOUT_CONFIRMED"
  | "PAYOUT_FAILED"
  | "RISK_DETECTED"
  | "PLAN_LIMIT_WARNING";

/**
 * Notification in-app (cloche du dashboard). Ne lève jamais : une notification
 * perdue ne doit pas faire échouer un webhook de paiement.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
}) {
  try {
    return await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        href: params.href,
      },
    });
  } catch (e) {
    console.error("NOTIFICATION_CREATE_ERROR:", e);
    return null;
  }
}
