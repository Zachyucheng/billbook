export const workspaceRoutes = {
  home: "/workspace",
  ledger: "/workspace/ledger",
  settings: "/workspace/settings",
  advanced: "/workspace/advanced",
} as const;

export function withObjectId(basePath: string, objectId?: string) {
  if (!objectId) {
    return basePath;
  }

  return `${basePath}?objectId=${encodeURIComponent(objectId)}`;
}
