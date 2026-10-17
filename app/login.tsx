"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.NEXT_PUBLIC_LOGIN_EMAIL!,
      password,
    });
    setBusy(false);
    if (error) setError("비밀번호가 맞지 않아요");
  }

  return (
    <main>
      <p className="title">종현 가게부</p>
      <form className="login" onSubmit={submit}>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>열기</button>
      </form>
    </main>
  );
}
