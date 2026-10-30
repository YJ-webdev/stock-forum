"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { User } from "@/types/user";

interface UserContextValue {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
}

interface UserProviderProps {
  user: User | null;
  children: ReactNode;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  user: initialUser,
  children,
}: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      setUser,
    }),
    [user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

function useUserContext() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("User hooks must be used within UserProvider.");
  }

  return context;
}

export function useCurrentUser() {
  return useUserContext().user;
}

export function useSetCurrentUser() {
  return useUserContext().setUser;
}
