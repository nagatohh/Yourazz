import { NextResponse } from "next/server";
import { getOpenBankingProvider } from "@/lib/payments";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = url.searchParams.get("country") || "FR";
  const provider = getOpenBankingProvider();
  const banks = await provider.listBanks(country);
  return NextResponse.json({ banks });
}
