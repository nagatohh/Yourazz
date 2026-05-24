import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function PaymentFailedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030308] px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-red-500/[0.05] blur-[100px]" />
      </div>
      <Card className="relative max-w-md text-center p-8 border-white/[0.06]">
        <div className="mb-6">
          <Logo size="md" />
        </div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement échoué</CardTitle>
        <CardDescription className="leading-relaxed">
          La transaction n&apos;a pas pu aboutir. Vérifiez vos informations de paiement et réessayez.
        </CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Réessayer</Button>
        </Link>
      </Card>
    </div>
  );
}
