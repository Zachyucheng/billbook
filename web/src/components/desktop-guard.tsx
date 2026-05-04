"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const isDesktop = typeof window !== "undefined" && !!window.billbookDesktop;
    if (!isDesktop) {
      router.replace("/");
    }
  }, [router]);

  return <>{children}</>;
}
