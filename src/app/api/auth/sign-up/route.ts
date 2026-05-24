import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "L'inscription publique est désactivée. Contactez un administrateur pour obtenir une invitation." },
    { status: 403 }
  );
}
