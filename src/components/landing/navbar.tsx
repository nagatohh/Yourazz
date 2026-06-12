"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const links = [
  { href: "#payments", label: "Moyens de paiement" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#security", label: "Sécurité" },
  { href: "#pricing", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/[0.05]" : ""
        }`}
      >
        <div className="mx-auto flex h-16 sm:h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Yourazz — Accueil">
            <Logo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-300"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="group">
                <span className="flex items-center gap-1.5">
                  Commencer
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Button>
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white transition-colors"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0a0a]/97 backdrop-blur-xl md:hidden animate-fade-in">
          <nav className="flex flex-col items-center justify-center h-full gap-7">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-xl font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-xl font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Connexion
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button size="lg" className="mt-3">
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
