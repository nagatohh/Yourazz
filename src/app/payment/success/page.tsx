import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="max-w-md text-center p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/10">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement réussi</CardTitle>
        <CardDescription>Votre paiement a été traité avec succès. Vous recevrez une confirmation par email.</CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}
