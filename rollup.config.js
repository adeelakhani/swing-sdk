import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

export default {
  input: 'src/index.ts',
  external: ['react', 'react-dom'],
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'SwingSDK',
      globals: {
        react: 'React',
      },
      plugins: [terser()],
    },
  ],
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL),
      preventAssignment: true,
    }),
    resolve(),
    typescript(),
  ],
};
