"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  ExternalLink,
  CheckCircle,
  LinkIcon,
  QrCode,
  Share2,
  Eye,
  User,
} from "lucide-react";

interface PaymentLink {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  isActive: boolean;
}

export default function PaymentLinkPage() {
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [profileCopied, setProfileCopied] = useState(false);

  useEffect(() => {
    apiFetch("/api/payment-link")
      .then((r) => r.json())
      .then((d) => setLink(d.link || null))
      .finally(() => setLoading(false));

    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.user?.username || null))
      .catch(() => {});
  }, []);

  const fullUrl = link ? `${window.location.origin}/pay/${link.slug}` : "";
  const profileUrl = username ? `${window.location.origin}/@${username}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setProfileCopied(true);
    setTimeout(() => setProfileCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Payer via Yourazz",
        text: "Envoyez un paiement securise",
        url: fullUrl,
      });
    } else {
      copyLink();
    }
  };

  if (loading)
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Lien de paiement
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Partagez votre lien pour recevoir des paiements
        </p>
      </div>

      {link ? (
        <>
          {/* Main link card */}
          <Card className="p-5 sm:p-8 border-brand-500/10 bg-gradient-to-br from-brand-500/[0.02] to-transparent">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-500/10 p-2.5">
                  <LinkIcon className="h-5 w-5 text-brand-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Votre lien de paiement</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Partagez-le avec vos clients pour recevoir des paiements
                  </CardDescription>
                </div>
              </div>
              <Badge variant={link.isActive ? "success" : "error"}>
                {link.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>

            {/* URL display */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] p-3 sm:p-4">
              <div className="flex-1 min-w-0 overflow-hidden">
                <code className="block truncate text-xs sm:text-sm text-brand-400 font-mono">
                  {fullUrl}
                </code>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyLink}
                  className={copied ? "text-emerald-400" : ""}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
            {copied && (
              <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Lien copie dans le presse-papier
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copier
              </Button>
              <Button variant="outline" size="sm" onClick={shareLink}>
                <Share2 className="mr-1.5 h-3.5 w-3.5" /> Partager
              </Button>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Apercu
                </Button>
              </a>
            </div>
          </Card>

          {/* Profil public */}
          {username && (
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-500/10 p-2.5">
                    <User className="h-5 w-5 text-brand-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Votre profil public</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Une page qui regroupe tous vos liens de paiement actifs
                    </CardDescription>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] p-3 sm:p-4">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <code className="block truncate text-xs sm:text-sm text-brand-400 font-mono">
                    {profileUrl}
                  </code>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyProfileLink}
                    className={profileCopied ? "text-emerald-400" : ""}
                  >
                    {profileCopied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Link details */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Label</p>
              <p className="text-sm font-medium text-white">{link.label}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Montant</p>
              <p className="text-sm font-medium text-white">
                {link.fixedAmount
                  ? `${(link.fixedAmount / 100).toFixed(2)} EUR`
                  : "Montant libre"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Slug</p>
              <p className="text-sm font-medium text-brand-400 font-mono">/pay/{link.slug}</p>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="p-5 sm:p-6">
            <CardTitle className="text-base mb-4">Comment ca marche</CardTitle>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Partagez votre lien",
                  desc: "Envoyez votre lien par SMS, email, WhatsApp ou sur les réseaux sociaux.",
                },
                {
                  step: "2",
                  title: "Le client paye",
                  desc: "Il entre le montant, ses informations et paye par carte, Apple Pay ou Google Pay.",
                },
                {
                  step: "3",
                  title: "Vous recevez l'argent",
                  desc: "Le montant est credite instantanement dans votre wallet Yourazz.",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20">
                    <span className="text-xs font-bold text-brand-400">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <LinkIcon className="h-6 w-6 text-zinc-500" />
          </div>
          <CardTitle className="text-base mb-2">Pas encore de lien</CardTitle>
          <CardDescription>
            Votre lien de paiement sera créé automatiquement lors de votre inscription.
            Si vous voyez ce message, contactez le support.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
