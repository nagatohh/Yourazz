"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setUser(d.user);
        setName(d.user.name || "");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-zinc-400">Gérez votre compte</p>
      </div>

      <Card>
        <CardTitle className="mb-4">Informations personnelles</CardTitle>
        <div className="space-y-4 max-w-md">
          <Input id="name" label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          <Input id="email" label="Email" value={user?.email || ""} disabled />
          <p className="text-xs text-zinc-500">L&apos;email ne peut pas être modifié pour le moment.</p>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Zone dangereuse</CardTitle>
        <p className="text-sm text-zinc-400 mb-4">La suppression du compte est irréversible.</p>
        <Button variant="destructive" disabled>Supprimer mon compte</Button>
      </Card>
    </div>
  );
}
