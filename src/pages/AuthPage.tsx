import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";

export function AuthPage() {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Supabase is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    if (!credential.trim() || !password) {
      setError("Enter email or phone and password.");
      return;
    }

    setLoading(true);
    const trimmedCredential = credential.trim();
    const isEmail = trimmedCredential.includes("@");

    const result = mode === "signup"
      ? await supabase.auth.signUp(isEmail
          ? {
              email: trimmedCredential,
              password
            }
          : {
              phone: trimmedCredential,
              password
            })
      : await supabase.auth.signInWithPassword(isEmail
          ? {
              email: trimmedCredential,
              password
            }
          : {
              phone: trimmedCredential,
              password
            });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage(isEmail ? "Account created. Confirm your email, then log in." : "Account created. Confirm your phone, then log in.");
      return;
    }

    setMessage(mode === "signup" ? "Account created. Loading FanAtlas..." : "Login successful. Loading FanAtlas...");
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">FA</div>
        <h1>FanAtlas</h1>
        <p>World Cup 2026 Travel Companion</p>

        <label>
          Email or phone
          <input
            autoComplete="username"
            inputMode="email"
            placeholder="you@example.com or +15551234567"
            type="text"
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <div className="auth-status error">{error}</div>}
        {message && <div className="auth-status">{message}</div>}

        <button className="primary-btn full-width" type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
        </button>

        {mode === "login" ? (
          <button className="secondary-btn full-width" type="button" onClick={() => switchMode("signup")}>
            New Customer? Sign Up
          </button>
        ) : (
          <button className="secondary-btn full-width" type="button" onClick={() => switchMode("login")}>
            Already a Customer? Login
          </button>
        )}
      </form>
    </div>
  );
}
