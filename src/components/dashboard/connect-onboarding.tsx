"use client";

import { useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { apiFetch } from "@/lib/fetch";
import { AlertCircle } from "lucide-react";

/**
 * Onboarding Stripe Connect EMBARQUÉ (le vendeur fait sa vérification d'identité
 * + IBAN sans quitter Yourazz). Le client_secret vient de
 * /api/stripe/connect/account-session ; aucune donnée bancaire ne passe par nous.
 */
export function ConnectOnboarding({ onExit }: { onExit?: () => void }) {
  const [error, setError] = useState("");

  const [connectInstance] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret: async () => {
        const res = await apiFetch("/api/stripe/connect/account-session", { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error || "Erreur lors de l'initialisation de la vérification.");
        }
        return data.clientSecret as string;
      },
      appearance: {
        variables: {
          colorPrimary: "#DC2626",
          colorBackground: "#0A0A0A",
          colorText: "#FFFFFF",
          borderRadius: "12px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      },
    }),
  );

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectAccountOnboarding
          onExit={() => onExit?.()}
          onLoadError={(e) =>
            setError(e?.error?.message || "La vérification n'a pas pu se charger. Réessayez.")
          }
        />
      </ConnectComponentsProvider>
    </div>
  );
}
