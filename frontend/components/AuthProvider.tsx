"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, memberApi, type Member } from "@/lib/memberApi";
const AuthContext = createContext<{
  member: Member | null; loading: boolean; error: string;
  setMember: (member: Member | null) => void; refresh: () => Promise<void>; logout: () => Promise<void>;
} | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    return memberApi<Member>("/auth/me").then(currentMember => {
      setMember(currentMember);
      setError("");
    }).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 401) { setMember(null); setError(""); }
      else setError(e instanceof Error ? e.message : "회원정보를 불러오지 못했습니다.");
    }).finally(() => { setLoading(false); });
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  async function logout() { await memberApi("/auth/logout", "POST"); setMember(null); }
  return <AuthContext.Provider value={{ member, loading, error, setMember, refresh, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
