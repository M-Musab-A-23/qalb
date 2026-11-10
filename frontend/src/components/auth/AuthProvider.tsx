"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuth,
  type LoginInput,
  type RegisterInput,
  type Role,
  type User,
} from "@/lib/auth";

type AuthContextValue = {
  /** False until the stored session has been read in the browser. */
  ready: boolean;
  user: User | null;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  loginDemo: (role: Role) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({
    ready: false,
    user: null,
  });

  useEffect(() => {
    const auth = getAuth();
    let active = true;
    function refresh() {
      void auth.currentUser().then((user) => {
        if (active) setState({ ready: true, user });
      });
    }
    refresh();
    const unsubscribe = auth.subscribe(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback((input: LoginInput) => getAuth().login(input), []);
  const register = useCallback(
    (input: RegisterInput) => getAuth().register(input),
    [],
  );
  const loginDemo = useCallback((role: Role) => getAuth().loginDemo(role), []);
  const logout = useCallback(() => getAuth().logout(), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, loginDemo, logout }),
    [state, login, register, loginDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
