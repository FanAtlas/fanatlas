import { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabase) {
      alert("Supabase is not connected.");
      return;
    }

    if (!email || !password) {
      alert("Enter email and password.");
      return;
    }

    setLoading(true);

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    if (mode === "signup") {
      alert("Account created. Check your email if confirmation is required.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FanAtlas</h1>
        <p>World Cup 2026 travel companion</p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>

        <button
          className="secondary-btn"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}
