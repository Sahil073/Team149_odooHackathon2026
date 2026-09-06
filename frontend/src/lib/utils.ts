export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'DF';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export function formatDisplayName(identifier: string): string {
  if (!identifier || !identifier.trim()) return 'User';
  const clean = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  const formatted = clean
    .split(/[\._\-+]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return formatted || identifier.trim();
}
