import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentFailedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] px-4 noise">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-red-500/[0.06] blur-[100px]" />
      </div>
      <Card className="relative max-w-md text-center p-8 border-white/[0.08]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement échoué</CardTitle>
        <CardDescription className="leading-relaxed">
          Le paiement n&apos;a pas pu être traité. Veuillez réessayer ou contacter le support.
        </CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}
