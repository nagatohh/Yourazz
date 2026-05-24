"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink } from "lucide-react";

interface PaymentLink {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  isActive: boolean;
}

export default function PaymentLinkPage() {
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/payment-link")
      .then((r) => r.json())
      .then((d) => setLink(d.link || null))
      .finally(() => setLoading(false));
  }, []);

  const fullUrl = link ? `${window.location.origin}/pay/${link.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lien de paiement</h1>
        <p className="text-sm text-zinc-400">Partagez votre lien pour recevoir des paiements</p>
      </div>

      {link ? (
        <Card>
          <CardTitle className="mb-2">Votre lien de paiement</CardTitle>
          <CardDescription className="mb-6">Partagez ce lien avec vos clients pour recevoir des paiements instantanément.</CardDescription>

          <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <code className="flex-1 min-w-0 truncate text-xs sm:text-sm text-brand-400">{fullUrl}</code>
            <div className="flex flex-shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          {copied && <p className="mt-2 text-xs text-emerald-400">Copié !</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-xs text-zinc-500">Label</p>
              <p className="font-medium text-white">{link.label}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-xs text-zinc-500">Montant</p>
              <p className="font-medium text-white">{link.fixedAmount ? `${(link.fixedAmount / 100).toFixed(2)} €` : "Libre"}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle className="mb-2">Pas encore de lien</CardTitle>
          <CardDescription>Votre lien de paiement sera créé automatiquement lors de votre inscription. Si vous voyez ce message, contactez le support.</CardDescription>
        </Card>
      )}
    </div>
  );
}
