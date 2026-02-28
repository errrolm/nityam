"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Inter } from "next/font/google";
import Grainient from "@/components/Grainient";

const inter = Inter({ subsets: ["latin"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for the confirmation link.");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative text-zinc-100 ${inter.className}`}
    >
      <div className="absolute inset-0 -z-10 bg-zinc-950">
        <Grainient
          color1="#0d9488"
          color2="#020617"
          color3="#0284c7"
          timeSpeed={0.2}
          warpStrength={2.5}
          warpFrequency={4}
          warpSpeed={1.5}
          warpAmplitude={60}
          noiseScale={2.5}
          grainAmount={0.06}
          contrast={1.4}
          zoom={1}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
      </div>

      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900/50 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 z-10 mx-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="h-12 w-auto mb-2">
            <img 
              src="/logo.png" 
              alt="Nityam Logo" 
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Welcome Back
          </h1>
          <p className="text-sm text-zinc-400">
            Enter your credentials to access your workspace.
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 backdrop-blur-md">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-4 text-sm text-teal-200 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center gap-3 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{message}</span>
          </div>
        )}

        <form className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full h-12 px-4 rounded-xl border border-white/10 bg-zinc-950/50 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-12 px-4 rounded-xl border border-white/10 bg-zinc-950/50 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all duration-200"
            />
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleSignIn}
              disabled={loading}
              className="
                w-full h-12
                bg-teal-500
                text-zinc-950
                font-bold
                rounded-xl
                shadow-[0_0_18px_rgba(20,184,166,0.25)]
                transition-all duration-200
                hover:bg-teal-400
                hover:shadow-[0_0_28px_rgba(45,212,191,0.35)]
                active:scale-[0.98]
                disabled:opacity-60
                disabled:shadow-none
                disabled:hover:bg-teal-500
                border-none
                flex items-center justify-center gap-2
                cursor-pointer
              "
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>

            <Button
              onClick={handleSignUp}
              disabled={loading}
              variant="outline"
              className="
                w-full h-12
                bg-white/5
                border-white/10
                text-zinc-200
                font-medium
                rounded-xl
                transition-all duration-200
                hover:bg-white/10
                hover:border-white/20
                hover:text-white
                active:scale-[0.98]
                disabled:opacity-60
                disabled:hover:bg-white/5
                cursor-pointer
              "
            >
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}