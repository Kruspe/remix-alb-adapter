import { createRequestHandler } from "remix-alb-adapter";
import * as build from "./build";

export const handler = createRequestHandler({
  build,
  getLoadContext(event) {
    // use lambda event to generate a context for loaders
    return {};
  },
});
