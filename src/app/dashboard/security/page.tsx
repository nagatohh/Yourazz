"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Smartphone, Copy, CheckCircle, AlertCircle } from "lucide-react";

type TwoFaStep = "idle" | "scanning" | "backup";

export default function SecurityPage() {
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<TwoFaStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setTotpEnabled(!!d.user?.totpEnabled))
      .catch(() => setTotpEnabled(false));
  }, []);

  const startSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep("scanning");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Code incorrect"); return; }
      setBackupCodes(data.backupCodes || []);
      setTotpEnabled(true);
      setStep("backup");
      setCode("");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const disable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Code incorrect"); return; }
      setTotpEnabled(false);
      setShowDisable(false);
      setDisableCode("");
      setStep("idle");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const require2fa =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("require2fa") === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sécurité</h1>
        <p className="text-sm text-zinc-400">Protégez votre compte</p>
      </div>

      {require2fa && !totpEnabled && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300">
            Le panneau d&apos;administration exige la double authentification. Activez le 2FA
            ci-dessous pour y accéder.
          </p>
        </div>
      )}

      {/* 2FA */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-brand-600/10 p-2.5">
              <Smartphone className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <CardTitle className="text-base mb-1">Authentification à deux facteurs (2FA)</CardTitle>
              <CardDescription>
                Un code de votre téléphone est exigé à la connexion et avant chaque retrait
              </CardDescription>
            </div>
          </div>
          {totpEnabled !== null && (
            <Badge variant={totpEnabled ? "success" : "warning"}>{totpEnabled ? "Activé" : "Désactivé"}</Badge>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Activation */}
        {totpEnabled === false && step === "idle" && (
          <Button onClick={startSetup} disabled={loading} className="mt-4" size="sm">
            {loading ? "Préparation…" : "Activer le 2FA"}
          </Button>
        )}

        {step === "scanning" && (
          <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto rounded-2xl bg-white p-3">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code 2FA" className="h-44 w-44" />
              )}
            </div>
            <div className="space-y-4">
              <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
                <li>Ouvrez Google Authenticator, Authy ou 1Password</li>
                <li>Scannez le QR code (ou saisissez la clé manuellement)</li>
                <li>Entrez le code à 6 chiffres généré</li>
              </ol>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Clé manuelle</p>
                <code className="break-all font-mono text-xs text-zinc-300">{secret}</code>
              </div>
              <form onSubmit={confirmEnable} className="flex gap-2">
                <Input
                  id="enable-code"
                  inputMode="numeric"
                  placeholder="123 456"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono"
                  required
                />
                <Button type="submit" disabled={loading || code.replace(/\s/g, "").length !== 6}>
                  {loading ? "…" : "Confirmer"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Codes de secours après activation */}
        {step === "backup" && backupCodes.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-sm font-medium text-amber-400 mb-1">
              ⚠️ Conservez ces codes de secours en lieu sûr
            </p>
            <p className="text-xs text-zinc-500 mb-3">
              Chaque code n&apos;est utilisable qu&apos;une seule fois si vous perdez votre téléphone. Ils ne seront
              plus jamais affichés.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {backupCodes.map((c) => (
                <code key={c} className="rounded-lg bg-black/40 px-2 py-1.5 text-center font-mono text-xs text-zinc-200">
                  {c}
                </code>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={copyBackupCodes} className="mt-3">
              {copied ? <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copied ? "Copiés" : "Copier les codes"}
            </Button>
          </div>
        )}

        {/* Désactivation */}
        {totpEnabled === true && step !== "backup" && (
          <div className="mt-4">
            {!showDisable ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)}>
                Désactiver le 2FA
              </Button>
            ) : (
              <form onSubmit={disable2fa} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-56">
                  <Input
                    id="disable-code"
                    placeholder="Code 2FA ou code de secours"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" size="sm" disabled={loading}>
                    {loading ? "…" : "Confirmer la désactivation"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowDisable(false); setDisableCode(""); setError(""); }}>
                    Annuler
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Card>

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
                  <div className={`h-2 w-2 rounded-full ${totpEnabled ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-sm text-zinc-300">{totpEnabled ? "2FA activé" : "2FA non activé"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
