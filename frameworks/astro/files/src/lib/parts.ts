// Modules add markup to the layout by putting a component in src/parts/<slot>/. Each slot renders
// its files in name order (10-a.astro before 20-b.astro), so adding or removing a module never
// means editing the layout. The globs live in the components that render each slot, because
// import.meta.glob only takes literal paths.

/* eslint-disable @typescript-eslint/no-explicit-any -- Astro components have no public type. */
type Part = { default: any };

export function inOrder(found: Record<string, unknown>): Part["default"][] {
  return Object.keys(found)
    .sort()
    .map((key) => (found[key] as Part).default);
}

export function has(found: Record<string, unknown>, name: string): boolean {
  return Object.keys(found).some((key) => key.includes(name));
}
