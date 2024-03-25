import { createRequestHandler } from "remix-alb-adapter";
import * as build from "./build/server/index";

export const handler = createRequestHandler({
  // TODO: check why types mismatch
  build,
});
