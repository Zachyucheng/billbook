export default function WorkspaceLoading() {
  return (
    <div className="flex h-[calc(100vh-220px)] items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
    </div>
  );
}
