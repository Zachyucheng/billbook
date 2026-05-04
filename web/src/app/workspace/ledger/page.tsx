"use client";

import { useSearchParams } from "next/navigation";
import { LedgerPage } from "@/components/ledger-page";

export default function WorkspaceLedgerPage() {
  const searchParams = useSearchParams();
  const objectId = searchParams.get("objectId") ?? undefined;

  return <LedgerPage initialObjectId={objectId} />;
}
