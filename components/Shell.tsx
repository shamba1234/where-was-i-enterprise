"use client";

import { usePathname } from "next/navigation";
import { StoreProvider } from "@/lib/store";
import AppHeader from "./AppHeader";
import { UIProvider } from "./UIProvider";

/** Providers + chrome. Workspaces render their own full-screen chrome. */
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <UIProvider>
        <Chrome>{children}</Chrome>
      </UIProvider>
    </StoreProvider>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/workspace")) return <>{children}</>;
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
