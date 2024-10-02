import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import polyfillNode from "rollup-plugin-polyfill-node";

export default [
  // ES Module build
  {
    input: "src/index.js",
    output: {
      file: "dist/js-indexus-sdk.esm.js",
      format: "esm",
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      json(),
      polyfillNode(),
    ],
  },
  // CommonJS build
  {
    input: "src/index.js",
    output: {
      file: "dist/js-indexus-sdk.cjs.js",
      format: "cjs",
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      json(),
      polyfillNode(),
    ],
  },
  // UMD build for direct browser inclusion
  {
    input: "src/index.js",
    output: {
      file: "dist/js-indexus-sdk.umd.js",
      format: "umd",
      name: "IndexusSDK",
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      json(),
      polyfillNode(),
    ],
  },
];
