import { site } from "../data/site";

export function Home() {
  return (
    <div className="stack">
      <h1 className="text-h1 font-bold">{site.name}</h1>
      <p className="max-w-prose text-lead text-fg-soft">{site.description}</p>
    </div>
  );
}
