import { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if(error){
      alert(error.message);
    }else{
      alert("Account created");
    }
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      alert(error.message);
    }
  };

  return (
    <div className="auth-page">

      <h1>FanAtlas</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button onClick={signIn}>
        Login
      </button>

      <button onClick={signUp}>
        Create Account
      </button>

    </div>
  );
}
