import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(16,185,129,0.07),transparent)]" />
      </div>
      <Card className="relative max-w-md text-center p-8 border-white/[0.06]">
        <div className="mb-6">
          <Logo size="md" />
        </div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement confirmé</CardTitle>
        <CardDescription className="leading-relaxed">
          Votre transaction a été traitée avec succès. Un reçu de confirmation vous sera envoyé par email.
        </CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}
