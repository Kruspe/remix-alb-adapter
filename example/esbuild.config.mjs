import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./server.ts"],
  bundle: true,
  minify: false,
  sourcemap: true,
  sourcesContent: false,
  target: "node18",
  platform: "node",
  outfile: "build/index.js",
  allowOverwrite: true,
  // define: {'require.resolve': 'null'},
});
