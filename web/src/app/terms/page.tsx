import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { termsDocument } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: termsDocument.title,
  description: termsDocument.summary,
};

export default function TermsPage() {
  return <LegalPage {...termsDocument} />;
}
