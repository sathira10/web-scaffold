import { useEffect } from "react";
import { Link } from "react-router";
import { site } from "../data/site";

export function NotFound() {
  useEffect(() => {
    document.title = `Not found | ${site.name}`;
  }, []);

  return (
    <>
      <h1 className="text-h1 font-bold">Page not found</h1>
      <p className="mt-4">
        <Link className="underline underline-offset-4" to="/">
          Back to the start
        </Link>
      </p>
    </>
  );
}
