import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — YouRazz",
};

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-[#030308] px-4 py-16 noise">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-8">Politique de Confidentialité</h1>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Données collectées</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nom, prénom et email (inscription)</li>
              <li>IBAN et BIC (retraits — stockés chiffrés)</li>
              <li>Données de transaction (montants, dates, statuts)</li>
              <li>Adresse IP et agent utilisateur (sécurité)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Finalités du traitement</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestion des comptes utilisateurs</li>
              <li>Traitement des paiements et retraits</li>
              <li>Prévention de la fraude</li>
              <li>Respect des obligations légales (KYC/AML)</li>
              <li>Communication relative au service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Base légale</h2>
            <p>
              Le traitement des données repose sur l&apos;exécution du contrat (fourniture du service),
              le respect d&apos;obligations légales (lutte anti-blanchiment) et notre intérêt légitime
              (sécurité de la plateforme).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Durée de conservation</h2>
            <p>
              Les données sont conservées pendant la durée de l&apos;utilisation du service,
              puis 5 ans après la clôture du compte conformément aux obligations légales
              en matière de lutte anti-blanchiment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Sous-traitants</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Stripe — traitement des paiements (UE/US)</li>
              <li>Vercel — hébergement (US)</li>
              <li>Supabase — base de données (UE)</li>
              <li>Resend — envoi d&apos;emails transactionnels (US)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Droit d&apos;accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l&apos;effacement</li>
              <li>Droit à la portabilité</li>
              <li>Droit d&apos;opposition</li>
              <li>Droit à la limitation du traitement</li>
            </ul>
            <p className="mt-2">
              Contact : contact@yourazz.xyz
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
              chiffrement TLS, hachage des mots de passe, chiffrement des données bancaires,
              contrôle d&apos;accès strict, journalisation des actions sensibles.
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
