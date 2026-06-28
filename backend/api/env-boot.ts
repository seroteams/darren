// Side-effect import: loads .env BEFORE any other module evaluates. Must be the
// first import in server.ts. Why a separate module and not a loadEnv() call in
// the server body: ES imports are evaluated before the importing file's body, so
// a body-level loadEnv() runs too late — modules that read env at load time (e.g.
// the sessions controller choosing the Postgres vs file repo on DATABASE_URL)
// would already have decided. Importing this first guarantees env is present.
import { loadEnv } from "../engine/env.ts";

loadEnv();
