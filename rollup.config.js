import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default [
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/indexus-sdk.esm.js',
      format: 'esm',
    },
    plugins: [resolve(), commonjs()],
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/indexus-sdk.cjs.js',
      format: 'cjs',
    },
    plugins: [resolve(), commonjs()],
  },
  // UMD build for direct browser inclusion
  {
    input: 'src/index.js',
    output: {
      file: 'dist/indexus-sdk.umd.js',
      format: 'umd',
      name: 'YourSDK', // Replace with a global variable name for UMD
    },
    plugins: [resolve(), commonjs()],
  },
];