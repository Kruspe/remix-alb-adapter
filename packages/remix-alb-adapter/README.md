# remix-alb-adapter

An adapter that allows you to integrate your Remix application with AWS ALB.

It works similar to the [`@remix-run/architect`](https://github.com/remix-run/remix/tree/main/packages/remix-architect)
and transforms the ALB event into requests that can be handled by Remix.

## Usage

Checkout the [`example`](https://github.com/Kruspe/remix-alb-adapter/tree/main/example).
It adds a server.ts function that uses the adapter, adds an esbuild step to build your application and that's it.

```ts
// server.ts
import { createRequestHandler } from "remix-alb-adapter";
import * as build from "./build";

export const handler = createRequestHandler({
  build,
  getLoadContext(event) {
    // use lambda event to generate a context for loaders
    return {};
  },
});
```

To create the build output first run `npx remix build` and afterward run esbuild.
You can deploy the build output to your lambda and host the static content however you want. 

## License

[MIT](./LICENSE)
