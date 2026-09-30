// app/context/user-context.tsx
"use client";

import { User } from "@/types/user";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface UserContextValue {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  user: initialUser,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  // Server에서 새로운 user가 들어오는 경우에도 동기화
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used within UserProvider.");
  }

  return context.user;
}

export function useSetCurrentUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useSetCurrentUser must be used within UserProvider.");
  }

  return context.setUser;
}
