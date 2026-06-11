interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { text: "text-lg", tagline: "text-[8px]" },
  md: { text: "text-xl", tagline: "text-[9px]" },
  lg: { text: "text-3xl", tagline: "text-[10px]" },
  xl: { text: "text-5xl", tagline: "text-[12px]" },
};

export function Logo({ size = "md", showTagline = false, className = "" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className={`${s.text} font-black tracking-tight text-white`}>
        You<span className="gradient-text">Razz</span>
      </span>
      {showTagline && (
        <span className={`${s.tagline} font-medium uppercase tracking-[0.3em] text-zinc-500 mt-1`}>
          Paiements sécurisés
        </span>
      )}
    </div>
  );
}
