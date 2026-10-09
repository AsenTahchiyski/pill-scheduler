// crypto.randomUUID only exists in secure contexts; the dev server is also
// opened over plain http on the LAN, so use a simple local generator.
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
