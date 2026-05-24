"use client";

import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Key, Smartphone } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sécurité</h1>
        <p className="text-sm text-zinc-400">Protégez votre compte</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-brand-600/10 p-2.5">
              <Key className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <CardTitle className="text-base mb-1">Mot de passe</CardTitle>
              <CardDescription>Changez votre mot de passe régulièrement</CardDescription>
              <button className="mt-3 text-sm text-brand-500 hover:text-brand-400">Modifier le mot de passe</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-brand-600/10 p-2.5">
              <Smartphone className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <CardTitle className="text-base mb-1">2FA</CardTitle>
              <CardDescription>Authentification à deux facteurs</CardDescription>
              <p className="mt-3 text-xs text-zinc-500">Bientôt disponible</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-emerald-600/10 p-2.5">
            <Shield className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-base mb-1">Statut de sécurité</CardTitle>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-300">Connexion sécurisée (HTTPS)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-300">IBAN chiffré en base de données</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-300">Session JWT signée</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm text-zinc-300">2FA non activé</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
