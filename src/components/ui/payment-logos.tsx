/**
 * Logos des moyens de paiement en SVG inline — aucun asset externe,
 * rendu net à toutes les résolutions, poids quasi nul.
 */

const tile =
  "flex h-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3";

export function VisaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`${tile} ${className}`} aria-label="Visa">
      <svg viewBox="0 0 48 16" className="h-3.5 w-auto" fill="none" role="img">
        <path
          d="M20.8 15.7h-3.9L19.3.3h3.9l-2.4 15.4zM35.4.7C34.6.4 33.4 0 31.9 0c-3.8 0-6.5 1.9-6.5 4.7 0 2 1.9 3.2 3.4 3.9 1.5.7 2 1.2 2 1.8 0 1-1.2 1.4-2.3 1.4-1.6 0-2.4-.2-3.7-.8l-.5-.2-.5 3.2c.9.4 2.6.8 4.3.8 4 0 6.7-1.9 6.7-4.9 0-1.6-1-2.8-3.2-3.8-1.3-.7-2.2-1.1-2.2-1.8 0-.6.7-1.2 2.2-1.2 1.2 0 2.1.2 2.8.5l.3.2.7-3.1zM45.5.3h-3c-.9 0-1.6.3-2 1.2l-5.8 14.2h4.1l.8-2.3h5l.5 2.3H48.7L45.5.3zm-4.8 9.9c.3-.9 1.6-4.2 1.6-4.2s.3-.9.5-1.5l.3 1.4s.8 3.6 1 4.4h-3.4zM13.6.3 9.8 10.8l-.4-2.1C8.7 6.3 6.5 3.7 4 2.4l3.5 13.2h4.1L17.7.3h-4.1z"
          fill="#fff"
        />
        <path d="M6.3.3H0L0 .6c4.9 1.3 8.1 4.3 9.4 8.1L8.1 1.5C7.9.6 7.2.3 6.3.3z" fill="#fff" opacity=".7" />
      </svg>
    </div>
  );
}

export function MastercardLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`${tile} ${className}`} aria-label="Mastercard">
      <svg viewBox="0 0 32 20" className="h-5 w-auto" role="img">
        <circle cx="12" cy="10" r="9" fill="#EB001B" />
        <circle cx="20" cy="10" r="9" fill="#F79E1B" />
        <path d="M16 2.9a9 9 0 0 1 0 14.2A9 9 0 0 1 16 2.9z" fill="#FF5F00" />
      </svg>
    </div>
  );
}

export function ApplePayLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`${tile} ${className}`} aria-label="Apple Pay">
      <svg viewBox="0 0 43 18" className="h-4 w-auto" fill="#fff" role="img">
        <path d="M8.1 2.3C8.6 1.7 9 .8 8.9 0c-.8 0-1.7.5-2.3 1.1-.5.5-1 1.4-.8 2.2.8.1 1.7-.4 2.3-1zm.8 1.2c-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.5-.7C2.1 3.6.9 4.3.3 5.5c-1.3 2.3-.3 5.7 1 7.5.6.9 1.4 1.9 2.4 1.9 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-.9 2.3-1.8c.7-1 1-2 1-2.1 0 0-2-.8-2-3 0-1.9 1.5-2.8 1.6-2.8-.9-1.3-2.2-1.6-2.7-1.7z" />
        <path d="M18.7 1.3c2.6 0 4.4 1.8 4.4 4.4 0 2.6-1.9 4.4-4.5 4.4h-2.9v4.5h-2.1V1.3h5.1zm-3 7h2.4c1.8 0 2.9-1 2.9-2.6 0-1.7-1-2.6-2.9-2.6h-2.4v5.2zm8 3c0-1.7 1.3-2.7 3.6-2.9l2.6-.2v-.7c0-1.1-.7-1.7-1.9-1.7-1.1 0-1.8.5-2 1.4h-1.9c.1-1.7 1.6-3 3.9-3 2.3 0 3.9 1.2 3.9 3.2v6.6h-1.9v-1.6h-.1c-.6 1.1-1.8 1.7-3 1.7-2 0-3.2-1.1-3.2-2.8zm6.2-.9v-.7l-2.3.2c-1.2.1-1.8.6-1.8 1.4 0 .8.7 1.3 1.7 1.3 1.3 0 2.4-.9 2.4-2.2zm3.8 7.5v-1.7c.1 0 .5.1.7.1.9 0 1.5-.4 1.8-1.4l.2-.6-3.5-9.7h2.2l2.4 7.9h.1l2.4-7.9h2.2L38.4 15c-.8 2.3-1.8 3-3.8 3-.1 0-.6 0-.9-.1z" />
      </svg>
    </div>
  );
}

export function GooglePayLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`${tile} ${className}`} aria-label="Google Pay">
      <svg viewBox="0 0 41 17" className="h-4 w-auto" role="img">
        <path d="M19.5 8.4v4.9h-1.6V1.2h4.1c1 0 1.9.3 2.6 1 .7.7 1.1 1.5 1.1 2.6 0 1-.4 1.9-1.1 2.6-.7.7-1.6 1-2.6 1h-2.5zm0-5.7v4.2h2.6c.6 0 1.1-.2 1.5-.6.4-.4.6-.9.6-1.5s-.2-1-.6-1.4c-.4-.4-.9-.6-1.5-.6h-2.6z" fill="#fff" />
        <path d="M29.7 4.7c1.2 0 2.1.3 2.8 1 .7.6 1 1.5 1 2.6v5h-1.5v-1.1H32c-.7.9-1.5 1.4-2.6 1.4-.9 0-1.7-.3-2.3-.8-.6-.5-.9-1.2-.9-2 0-.9.3-1.5 1-2 .6-.5 1.5-.8 2.6-.8.9 0 1.7.2 2.3.5v-.4c0-.5-.2-1-.6-1.4-.4-.4-.9-.6-1.5-.6-.9 0-1.5.4-2 1.1l-1.4-.9c.8-1 1.8-1.6 3.1-1.6zm-2 6.2c0 .4.2.7.5 1 .3.3.7.4 1.1.4.6 0 1.2-.2 1.6-.7.5-.5.7-1 .7-1.6-.5-.4-1.2-.6-2-.6-.6 0-1.1.1-1.5.4-.3.3-.4.7-.4 1.1z" fill="#fff" />
        <path d="m41 5-5.2 12h-1.6l1.9-4.2-3.4-7.8h1.7l2.5 6h.1l2.4-6H41z" fill="#fff" />
        <path d="M13.5 7.3c0-.5-.1-1-.1-1.4H6.9v2.7h3.7c-.2.9-.7 1.6-1.4 2.1v1.7h2.2c1.3-1.2 2.1-3 2.1-5.1z" fill="#4285F4" />
        <path d="M6.9 14.1c1.9 0 3.4-.6 4.5-1.7l-2.2-1.7c-.6.4-1.4.7-2.3.7-1.8 0-3.3-1.2-3.8-2.8H.8v1.8c1.1 2.2 3.4 3.7 6.1 3.7z" fill="#34A853" />
        <path d="M3.1 8.6c-.3-.9-.3-1.8 0-2.6V4.2H.8c-1 1.9-1 4.2 0 6.1l2.3-1.7z" fill="#FBBC04" />
        <path d="M6.9 3.2c1 0 1.9.3 2.6 1l2-2C10.2.9 8.7.4 6.9.4 4.2.4 1.9 1.9.8 4.2l2.3 1.8c.5-1.7 2-2.8 3.8-2.8z" fill="#EA4335" />
      </svg>
    </div>
  );
}

export function CardGenericLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`${tile} gap-1.5 ${className}`} aria-label="Carte bancaire">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth="1.8" role="img">
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <path d="M2 10h20" />
      </svg>
      <span className="text-[11px] font-medium text-white">CB</span>
    </div>
  );
}

export function PaymentMethodsRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <VisaLogo />
      <MastercardLogo />
      <ApplePayLogo />
      <GooglePayLogo />
      <CardGenericLogo />
    </div>
  );
}
