import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] px-4 noise">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
      </div>
      <Card className="relative max-w-md text-center p-8 border-white/[0.08]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement réussi</CardTitle>
        <CardDescription className="leading-relaxed">
          Votre paiement a été traité avec succès. Vous recevrez une confirmation par email.
        </CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}
