"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  username: string | null;
  email: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setUser(d.user);
        setName(d.user.name || "");
        setUsername(d.user.username || "");
      }
    });
  }, []);

  const dirty = name !== (user?.name || "") || username !== (user?.username || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (name !== (user?.name || "")) payload.name = name;
      if (username !== (user?.username || "")) payload.username = username;

      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUser(data.user);
      setSuccess("Modifications enregistrées");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Erreur réseau"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-zinc-400">Gérez votre compte</p>
      </div>

      <Card>
        <CardTitle className="mb-4">Informations personnelles</CardTitle>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <Input id="name" label="Nom" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          <div>
            <Input
              id="username"
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              placeholder="ex : monpseudo"
              minLength={3}
              maxLength={30}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Détermine l&apos;adresse de votre profil public :{" "}
              <span className="text-brand-400 font-mono">yourazz.xyz/@{username || "votre-nom"}</span>
            </p>
            {user?.username && (
              <a
                href={`/@${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-brand-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Voir mon profil public
              </a>
            )}
          </div>
          <Input id="email" label="Email" value={user?.email || ""} disabled />
          <p className="text-xs text-zinc-500">L&apos;email ne peut pas être modifié pour le moment.</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-4">Zone dangereuse</CardTitle>
        <p className="text-sm text-zinc-400 mb-4">La suppression du compte est irréversible.</p>
        <Button variant="destructive" disabled>Supprimer mon compte</Button>
      </Card>
    </div>
  );
}
