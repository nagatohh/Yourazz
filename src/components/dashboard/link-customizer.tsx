"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, CheckCircle, AlertCircle } from "lucide-react";

interface CustomizableLink {
  id: string;
  label: string;
  description: string | null;
  brandColor: string | null;
  logoUrl: string | null;
}

const COLOR_PRESETS = ["#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
const DEFAULT_COLOR = "#dc2626";

export function LinkCustomizer({ link, onSaved }: { link: CustomizableLink; onSaved: (l: CustomizableLink) => void }) {
  const [label, setLabel] = useState(link.label);
  const [description, setDescription] = useState(link.description || "");
  const [brandColor, setBrandColor] = useState(link.brandColor || DEFAULT_COLOR);
  const [logoUrl, setLogoUrl] = useState(link.logoUrl || "");
  const [logoBroken, setLogoBroken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await apiFetch("/api/payment-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          description: description.trim() || null,
          brandColor: brandColor === DEFAULT_COLOR ? null : brandColor,
          logoUrl: logoUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      onSaved(data.link);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl bg-brand-500/10 p-2.5">
          <Palette className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <CardTitle className="text-base">Personnalisation</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Logo, couleur et description affichés sur votre page de paiement
          </CardDescription>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Formulaire */}
        <div className="space-y-4">
          <Input
            id="custom-label"
            label="Titre de la page"
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Payer Jean Dupont"
          />

          <div className="space-y-2">
            <label htmlFor="custom-description" className="block text-sm font-medium text-zinc-300">
              Description <span className="text-zinc-600">(optionnel)</span>
            </label>
            <textarea
              id="custom-description"
              maxLength={280}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présentez votre activité, vos services…"
              className="flex w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-all duration-200 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white/[0.05] resize-none"
            />
            <p className="text-[11px] text-zinc-600 text-right">{description.length}/280</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Couleur de marque</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrandColor(c)}
                  aria-label={`Couleur ${c}`}
                  className={`h-8 w-8 rounded-lg transition-transform ${
                    brandColor.toLowerCase() === c ? "ring-2 ring-white scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-lg border border-dashed border-white/20 hover:border-white/40 transition-colors">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Couleur personnalisée"
                />
                <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">+</span>
              </label>
            </div>
          </div>

          <Input
            id="custom-logo"
            label="URL du logo (optionnel)"
            type="url"
            placeholder="https://exemple.com/logo.png"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setLogoBroken(false);
            }}
          />
          <p className="text-[11px] text-zinc-600 -mt-2">
            Image carrée recommandée (min. 160×160px), hébergée en https.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button onClick={save} disabled={saving || label.trim().length < 2} className="w-full sm:w-auto">
            {saving ? "Enregistrement…" : saved ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Enregistré
              </span>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>

        {/* Aperçu live */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-5 flex flex-col items-center justify-center text-center min-h-[260px]">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Aperçu</p>
          {logoUrl && !logoBroken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              onError={() => setLogoBroken(true)}
              className="mb-3 h-16 w-16 rounded-full object-cover ring-4 ring-white/[0.05]"
            />
          ) : (
            <div
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-white/[0.05]"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }}
            >
              <span className="text-xl font-bold text-white">YZ</span>
            </div>
          )}
          {logoBroken && (
            <p className="mb-2 text-[11px] text-amber-400">Image introuvable — vérifiez l&apos;URL</p>
          )}
          <p className="text-sm font-semibold text-white">{label || "Titre de la page"}</p>
          {description && (
            <p className="mt-1.5 max-w-[240px] text-[11px] leading-relaxed text-zinc-500 line-clamp-3">{description}</p>
          )}
          <div
            className="mt-4 rounded-lg px-5 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: brandColor }}
          >
            Payer
          </div>
        </div>
      </div>
    </Card>
  );
}
