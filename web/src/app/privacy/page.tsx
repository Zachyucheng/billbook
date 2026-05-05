import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacyDocument } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: privacyDocument.title,
  description: privacyDocument.summary,
};

export default function PrivacyPage() {
  return <LegalPage {...privacyDocument} />;
}
