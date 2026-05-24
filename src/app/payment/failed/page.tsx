import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentFailedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="max-w-md text-center p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement échoué</CardTitle>
        <CardDescription>Le paiement n&apos;a pas pu être traité. Veuillez réessayer ou contacter le support.</CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}
