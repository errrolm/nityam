"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Inter } from "next/font/google";
import { ArrowRight, ShieldCheck, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Grainient from "@/components/Grainient";

const inter = Inter({ subsets: ["latin"] });

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    let lastState = false;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeScrolled = window.scrollY > 10;

          if (shouldBeScrolled !== lastState) {
            lastState = shouldBeScrolled;
            setScrolled(shouldBeScrolled);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCTA = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col relative text-zinc-100 selection:bg-teal-500/30 ${inter.className}`}
    >
      <div className="fixed inset-0 -z-10 bg-[#020617]">
        <Grainient
          color1="#0d9488"
          color2="#020617"
          color3="#075985"
          timeSpeed={0.1}
          warpStrength={2}
          warpFrequency={3}
          warpSpeed={1}
          warpAmplitude={50}
          noiseScale={2}
          grainAmount={0.05}
          contrast={1.2}
          zoom={1}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/20 via-[#020617]/80 to-[#020617]" />
      </div>

      <nav
        className={`fixed top-0 w-full h-16 flex items-center z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#020617]/60 backdrop-blur-xl border-b border-white/5 shadow-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          
          {/* Updated Logo Section */}
          <div
            className="flex items-center group cursor-pointer h-10 w-auto"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            <img 
              src="/logo.png" 
              alt="Nityam Logo" 
              className="h-full w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </div>

          <div className="flex items-center gap-4">
            {!loading && (
              <Button
                variant="ghost"
                onClick={handleCTA}
                className="cursor-pointer text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {session ? "Workspace" : "Sign In"}
              </Button>
            )}

            <Button
              onClick={handleCTA}
              className="hidden sm:flex cursor-pointer bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg px-5 h-9 transition-all border-none"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/5 text-teal-300 text-[13px] font-medium mb-10 border border-teal-500/10 backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 text-teal-400 fill-teal-400/20" />
          AI-Powered Policy Intelligence
        </div>

        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter max-w-5xl leading-[1.1] mb-8">
          Decode policy into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-sky-400">
            actionable steps.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-12 font-medium">
          Upload legal documents or SOPs. Nityam instantly generates structured
          instructions, SLAs, and compliance checklists.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button
            onClick={handleCTA}
            className="h-14 px-10 text-lg cursor-pointer bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 border-none"
          >
            {session ? "Enter Workspace" : "Start Analyzing Free"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full">
          {[
            {
              icon: <FileText className="w-6 h-6" />,
              title: "Data Extraction",
              text: "Pulls deadlines and critical decision points from any text instantly.",
              color: "sky",
            },
            {
              icon: <Zap className="w-6 h-6" />,
              title: "Automated Validation",
              text: "Converts text rules into deterministic, executable evaluation engines.",
              color: "teal",
            },
            {
              icon: <ShieldCheck className="w-6 h-6" />,
              title: "Audit Trail",
              text: "Every workflow step is linked to the exact source clause for total proof.",
              color: "indigo",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group p-8 bg-zinc-900/20 backdrop-blur-md rounded-[2.5rem] border border-white/5 transition-all duration-500 hover:bg-zinc-900/40 hover:border-white/10 text-left"
            >
              <div
                className={`w-12 h-12 bg-${feature.color}-500/10 text-${feature.color}-400 rounded-2xl flex items-center justify-center mb-6 border border-${feature.color}-500/20 group-hover:scale-110 transition-transform`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}