"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("register") === "true";

  const [mode, setMode] = useState<"login" | "register">(
    isRegister ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setAuth = useAppStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let tokens;
      if (mode === "register") {
        tokens = await auth.register({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
        });
      } else {
        tokens = await auth.login({ email, password });
      }

      // Get user info
      localStorage.setItem("bcr_token", tokens.access_token);
      const user = await auth.me();
      setAuth(tokens.access_token, tokens.refresh_token, user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy to-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <h1 className="mb-2 text-2xl font-bold text-white">
          {mode === "login" ? "Bine ai revenit" : "Creeaza cont"}
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          {mode === "login"
            ? "Autentifica-te pentru a-ti gestiona programarile"
            : "Inregistreaza-te gratuit si incepe in 2 minute"}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="Nume complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Telefon (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
          />
          <input
            type="password"
            placeholder="Parola"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-blue px-4 py-2.5 font-semibold text-white hover:bg-brand-blue-light disabled:opacity-50"
          >
            {loading
              ? "Se incarca..."
              : mode === "login"
              ? "Autentificare"
              : "Creeaza cont"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          {mode === "login" ? "Nu ai cont?" : "Ai deja cont?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-medium text-brand-blue hover:underline"
          >
            {mode === "login" ? "Inregistreaza-te" : "Autentifica-te"}
          </button>
        </p>
      </div>
    </div>
  );
}
