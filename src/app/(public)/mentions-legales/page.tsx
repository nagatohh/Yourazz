import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales — YouRazz",
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-16 noise">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-8">Mentions Légales</h1>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Éditeur du site</h2>
            <p>
              YouRazz<br />
              Plateforme de paiement en ligne<br />
              Site web : https://yourazz.xyz<br />
              Email : contact@yourazz.xyz
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Hébergement</h2>
            <p>
              Vercel Inc.<br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, États-Unis<br />
              https://vercel.com
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site YouRazz (textes, images, logo, design) est protégé
              par le droit d&apos;auteur. Toute reproduction sans autorisation préalable est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Données personnelles</h2>
            <p>
              Conformément au RGPD (Règlement Général sur la Protection des Données) et à la loi
              Informatique et Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification,
              de suppression et de portabilité de vos données personnelles.
            </p>
            <p className="mt-2">
              Les données collectées sont nécessaires au traitement des paiements et à la gestion
              de votre compte. Elles ne sont jamais revendues à des tiers.
            </p>
            <p className="mt-2">
              Pour exercer vos droits : contact@yourazz.xyz
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
            <p>
              Le site utilise des cookies strictement nécessaires au fonctionnement du service
              (authentification, sécurité). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Prestataire de paiement</h2>
            <p>
              Les paiements sont traités par Stripe (Stripe Payments Europe, Ltd.),
              agréé en tant qu&apos;établissement de monnaie électronique. Vos données bancaires
              ne transitent jamais par nos serveurs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Droit applicable</h2>
            <p>
              Le présent site est soumis au droit français. Tout litige sera soumis
              aux tribunaux compétents.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <a href="/" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
            &larr; Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
