import { createContext, useContext, useEffect, useState } from "react";
import { getSession, login as loginSvc, register as regSvc, logout as logoutSvc } from "./authService";
import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Sinkronisasi Firebase auth state + fallback local session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const u = {
          email: fbUser.email ?? "",
          name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "User",
          photoURL: fbUser.photoURL ?? "",
          provider: "google",
          uid: fbUser.uid,
        };
        setUser(u);
      } else {
        setUser(getSession());
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  // Email/Password (mock localStorage)
  const login = async (payload) => {
    const u = await loginSvc(payload);
    setUser(u);
    return u;
  };

  const register = async (payload) => {
    return await regSvc(payload); // tidak set user (no auto-login)
  };

  // Google
  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user; // state ditangani oleh onAuthStateChanged
  };

  const logout = async () => {
    try { await signOut(auth); } catch {}
    logoutSvc();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
