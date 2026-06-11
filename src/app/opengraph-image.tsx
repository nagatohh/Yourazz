import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Yourazz — Plateforme de paiement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(220,38,38,0.18), transparent 70%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: "-4px",
          }}
        >
          <span style={{ color: "#ffffff" }}>You</span>
          <span style={{ color: "#dc2626" }}>razz</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#a1a1aa",
            textAlign: "center",
          }}
        >
          Recevez, gérez et retirez vos paiements simplement.
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 52,
          }}
        >
          {["Carte bancaire", "Apple Pay", "Google Pay", "Sécurisé par Stripe"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "12px 26px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#e4e4e7",
                fontSize: 22,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #dc2626, transparent)",
          }}
        />
      </div>
    ),
    size
  );
}
