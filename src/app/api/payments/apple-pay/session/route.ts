import { NextResponse } from "next/server";
import { getApplePayProvider } from "@/lib/payments";
import { applePaySessionSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { validationUrl } = applePaySessionSchema.parse(body);

    const provider = getApplePayProvider();
    const result = await provider.createSession({
      validationUrl,
      displayName: "Yourazz",
      domainName: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname,
    });

    return NextResponse.json(result.merchantSession);
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("APPLE_PAY_SESSION:", e);
    return NextResponse.json({ error: "Erreur session Apple Pay" }, { status: 500 });
  }
}
