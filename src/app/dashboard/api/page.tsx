"use client";

import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Key, ExternalLink } from "lucide-react";
import { ApiKeysManager } from "@/components/dashboard/api-keys";
import Link from "next/link";

const BASE = "https://yourazz.xyz/api/v1";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/stats",
    description: "Solde, revenus du jour/mois, taux de succès",
  },
  {
    method: "GET",
    path: "/wallet",
    description: "Solde disponible et en attente",
  },
  {
    method: "GET",
    path: "/transactions",
    description: "Liste des transactions (filtres: status, type, limit, offset)",
  },
  {
    method: "GET",
    path: "/payment-links",
    description: "Liste de vos liens de paiement",
  },
  {
    method: "POST",
    path: "/payment-links",
    description: "Créer un lien de paiement (body: { label, description?, fixedAmount? })",
  },
];

function MethodBadge({ method }: { method: string }) {
  const variant = method === "GET" ? "success" : "info";
  return <Badge variant={variant} className="font-mono text-[10px] px-1.5">{method}</Badge>;
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">API Yourazz</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Accédez à vos données par programmation — plan Business requis
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-brand-500/10 p-2.5">
            <Code className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <CardTitle className="text-base">Authentification</CardTitle>
            <CardDescription className="text-xs mt-0.5">Bearer token dans le header Authorization</CardDescription>
          </div>
        </div>
        <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4">
          <code className="text-sm text-zinc-300 block">
            <span className="text-zinc-600">curl</span> {BASE}/stats \<br />
            {"  "}<span className="text-zinc-600">-H</span> <span className="text-amber-400">&quot;Authorization: Bearer yz_votre_cle&quot;</span>
          </code>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-white/[0.04] p-2.5">
            <ExternalLink className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <CardTitle className="text-base">Endpoints disponibles</CardTitle>
            <CardDescription className="text-xs mt-0.5">Base URL : {BASE}</CardDescription>
          </div>
        </div>
        <div className="space-y-2">
          {ENDPOINTS.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <MethodBadge method={ep.method} />
              <div className="min-w-0">
                <code className="text-sm text-white font-mono">{ep.path}</code>
                <p className="text-[11px] text-zinc-500 mt-0.5">{ep.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-white/[0.04] p-2.5">
            <Code className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <CardTitle className="text-base">Exemples</CardTitle>
            <CardDescription className="text-xs mt-0.5">JavaScript (fetch)</CardDescription>
          </div>
        </div>
        <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4 overflow-x-auto">
          <pre className="text-xs text-zinc-300 whitespace-pre">{`const res = await fetch("${BASE}/stats", {
  headers: { Authorization: "Bearer yz_votre_cle" },
});
const data = await res.json();
console.log(data.balance.available); // centimes EUR`}</pre>
        </div>
        <div className="mt-4 rounded-lg bg-black/40 border border-white/[0.06] p-4 overflow-x-auto">
          <pre className="text-xs text-zinc-300 whitespace-pre">{`// Créer un lien de paiement
const res = await fetch("${BASE}/payment-links", {
  method: "POST",
  headers: {
    Authorization: "Bearer yz_votre_cle",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    label: "Commande #123",
    fixedAmount: 2500, // 25.00 EUR en centimes
  }),
});
const { link, url } = await res.json();`}</pre>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-white/[0.04] p-2.5">
            <Code className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <CardTitle className="text-base">Réponses d&apos;erreur</CardTitle>
          </div>
        </div>
        <div className="space-y-2 text-sm text-zinc-400">
          <p><Badge variant="error" className="mr-2">401</Badge> Clé API manquante, invalide ou révoquée</p>
          <p><Badge variant="error" className="mr-2">403</Badge> Plan Business requis (clé liée à un plan Starter/Pro)</p>
          <p><Badge variant="warning" className="mr-2">400</Badge> Données de requête invalides</p>
          <p><Badge variant="error" className="mr-2">429</Badge> Rate limit atteint (60 req/min)</p>
        </div>
      </Card>

      <ApiKeysManager />

      <p className="text-center text-xs text-zinc-600">
        <Link href="/dashboard/plan" className="text-brand-400 hover:text-brand-300">Gérer mon plan</Link>
        {" · "}L&apos;API est réservée au plan Business
      </p>
    </div>
  );
}
