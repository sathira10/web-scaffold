// Shapes shared by the Worker and the client. GET /api/health; `db` is true when D1 answered.
export type HealthResponse = { ok: true; db: boolean };
