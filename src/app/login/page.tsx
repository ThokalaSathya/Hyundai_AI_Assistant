/*"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfoMsg("Account created. Check your email to confirm before signing in.");
          setMode("login");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-sm text-slate-400 mt-1 mb-5">
          Hyundai Automotive Assistant
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />

          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}
          {infoMsg && (
            <p className="text-xs text-emerald-400">{infoMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 py-2.5 text-sm font-semibold text-slate-950"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErrorMsg(null);
            setInfoMsg(null);
          }}
          className="mt-4 text-xs text-sky-400 hover:underline"
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
  */


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfoMsg("Account created. Check your email to confirm before signing in.");
          setMode("login");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#172554_0%,#020617_55%,#020617_100%)] text-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-900/85 p-7 shadow-2xl backdrop-blur space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            Hyundai Automotive Assistant
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-sm text-slate-400">
            {mode === "login"
              ? "Access your uploaded vehicle manuals and AI chat."
              : "Sign up to start indexing Hyundai manual PDFs."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-slate-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-sky-400 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-800/70 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/50 px-3.5 py-2.5 text-xs text-emerald-300">
              {infoMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 py-2.5 text-sm font-semibold text-slate-950 transition"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="border-t border-slate-800/80 pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline"
          >
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}