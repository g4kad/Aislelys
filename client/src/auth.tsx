import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "./types";
import * as api from "./api";
import { useClerk } from "@clerk/react";

type AuthState = {
  loading: boolean;
  user: User | null;
  accounts: User[];
  workspaceNotFound: boolean;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ coupleId, children }: { coupleId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [workspaceNotFound, setWorkspaceNotFound] = useState(false);
  const clerk = useClerk();

  async function refreshStatus() {
    try {
      const status = await api.getCoupleAuthStatus(coupleId);
      setAccounts(status.users);
      setWorkspaceNotFound(false);
      try {
        const me = await api.getMe();
        // A session cookie may belong to a different workspace (e.g. this
        // browser was last logged into another couple's planner) — only
        // treat it as "logged in" if that user actually belongs here.
        setUser(status.users.some((u) => u.id === me.id) ? me : null);
      } catch {
        setUser(null);
      }
    } catch {
      setWorkspaceNotFound(true);
      setAccounts([]);
      setUser(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    refreshStatus().finally(() => setLoading(false));
  }, [coupleId]);

  async function login(userId: string, password: string) {
    const u = await api.loginToCouple(coupleId, userId, password);
    setUser(u);
  }

  async function logout() {
    await api.logout();
    setUser(null);
    // signed in with Clerk too? end that session and go to the Home page
    if (clerk.isSignedIn) await clerk.signOut({ redirectUrl: "/" });
  }

  return (
    <AuthContext.Provider value={{ loading, user, accounts, workspaceNotFound, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// A stand-in for showing app components outside a real planner (the public
// Home page's previews): fixed sample partners, nobody signed in, no network.
export function DemoAuthProvider({ accounts, children }: { accounts: User[]; children: ReactNode }) {
  const noop = async () => {};
  return (
    <AuthContext.Provider
      value={{ loading: false, user: null, accounts, workspaceNotFound: false, login: noop, logout: noop }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
