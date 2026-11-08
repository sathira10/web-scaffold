import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** A Drizzle client for one request. D1 has no interactive transactions: use db.batch(). */
export function database(env: Env) {
  return drizzle(env.DB, { schema });
}
