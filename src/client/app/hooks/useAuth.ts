"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "./state/useRedux";

export function useAuth() {
  const user = useAppSelector((state) => state.auth.user);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const resolvedUser = hasMounted ? user : undefined;

  return {
    user: resolvedUser,
    isAuthenticated: !!resolvedUser,
    isLoading: !hasMounted || user === undefined,
  };
}
