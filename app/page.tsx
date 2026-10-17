"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import Ledger from "./ledger";
import Login from "./login";

export default function Home() {
  // undefined: 확인 중, null: 로그인 안 됨
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    // 세션이 없으면 저장된 비밀번호로 자동 로그인 (실패하면 로그인 화면)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return setSession(data.session);
      const password = process.env.NEXT_PUBLIC_LOGIN_PASSWORD;
      if (!password) return setSession(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: process.env.NEXT_PUBLIC_LOGIN_EMAIL!,
        password,
      });
      if (error) setSession(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Ledger /> : <Login />;
}
