// `server-only` throws when imported outside the Next.js server bundle. Its
// purpose is a build-time guard, so tests redirect that specifier to an empty
// stub. Import this file first in any test that loads a "server-only" module.
import Module from "node:module";
import path from "node:path";

type ResolveFilename = (
  this: unknown,
  request: string,
  ...rest: unknown[]
) => string;

const STUB = path.join(__dirname, "stubs", "server-only.cjs");
const loader = Module as unknown as { _resolveFilename: ResolveFilename };
const resolveFilename = loader._resolveFilename;

loader._resolveFilename = function resolveWithStub(request, ...rest) {
  if (request === "server-only") {
    return STUB;
  }
  return resolveFilename.call(this, request, ...rest);
};
