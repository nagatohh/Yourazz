import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — YouRazz",
};

export default function CGV() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-16 noise">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-8">Conditions Générales de Vente</h1>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent l&apos;utilisation de la
              plateforme YouRazz, accessible à l&apos;adresse https://yourazz.xyz, permettant à ses
              utilisateurs de recevoir des paiements en ligne.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Inscription</h2>
            <p>
              L&apos;inscription à la plateforme est soumise à invitation. L&apos;utilisateur doit
              fournir des informations exactes et à jour. Tout compte créé avec des informations
              frauduleuses sera suspendu.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Services</h2>
            <p>
              YouRazz fournit un service de génération de liens de paiement et de réception de fonds.
              Les fonds reçus sont crédités sur le portefeuille de l&apos;utilisateur après
              confirmation du paiement par notre prestataire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Tarification</h2>
            <p>
              Une commission est prélevée sur chaque transaction reçue. Le taux de commission
              en vigueur est communiqué à l&apos;utilisateur lors de son inscription et dans
              son espace personnel.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Retraits</h2>
            <p>
              L&apos;utilisateur peut demander un retrait de ses fonds vers un compte bancaire
              vérifié. Les délais de traitement sont de 1 à 3 jours ouvrés. Un montant minimum
              peut être requis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Responsabilités</h2>
            <p>
              YouRazz ne peut être tenu responsable des transactions frauduleuses initiées par
              des tiers. L&apos;utilisateur est responsable de la sécurité de son compte et
              de ses identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Résiliation</h2>
            <p>
              L&apos;utilisateur peut résilier son compte à tout moment. Les fonds restants
              sur le portefeuille seront transférés vers le compte bancaire enregistré sous
              réserve des vérifications d&apos;usage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Suspension</h2>
            <p>
              YouRazz se réserve le droit de suspendre ou fermer un compte en cas de violation
              des présentes CGV, de fraude avérée ou suspectée, ou de demande des autorités
              compétentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Modification des CGV</h2>
            <p>
              YouRazz se réserve le droit de modifier les présentes CGV. Les utilisateurs seront
              informés de toute modification par email. La poursuite de l&apos;utilisation du
              service vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Droit applicable</h2>
            <p>
              Les présentes CGV sont soumises au droit français. En cas de litige, les parties
              s&apos;engagent à rechercher une solution amiable avant de saisir les juridictions
              compétentes.
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
