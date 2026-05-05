import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { securityDocument } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: securityDocument.title,
  description: securityDocument.summary,
};

export default function SecurityPage() {
  return <LegalPage {...securityDocument} />;
}
