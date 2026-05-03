import { DesktopGuard } from "@/components/desktop-guard";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DesktopGuard>{children}</DesktopGuard>;
}
