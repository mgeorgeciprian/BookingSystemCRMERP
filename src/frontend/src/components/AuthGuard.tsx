"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { auth } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const logout = useAppStore((s) => s.logout);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAuthentication = async () => {
      if (!token) {
        router.replace("/login");
        return;
      }

      // If we already have user data, we're good
      if (user) {
        setIsVerifying(false);
        return;
      }

      // Token exists but no user data — verify token and fetch user
      try {
        const fetchedUser = await auth.me();
        setAuth(token, useAppStore.getState().refreshToken || "", fetchedUser);
        setIsVerifying(false);
      } catch {
        // Token is invalid or expired
        logout();
        router.replace("/login");
      }
    };

    verifyAuthentication();
  }, [token, user, router, setAuth, logout]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          <p className="text-sm text-gray-500">Se incarca...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
