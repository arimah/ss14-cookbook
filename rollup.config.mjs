import fs, {readFileSync} from 'fs';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import html from '@rollup/plugin-html';
import postcssNested from 'postcss-nested';

const dir = import.meta.dirname;
const pkg = JSON.parse(fs.readFileSync(`${dir}/package.json`));

const env = process.env.NODE_ENV || 'production';
const isDev = env === 'development';
const basePath = process.env.COOKBOOK_BASE_PATH || '';
const repoUrl = process.env.COOKBOOK_REPO_URL || 'https://example.com';
const trustedHosts = (process.env.COOKBOOK_TRUSTED_HOSTS || '').split(/\s+/).filter(Boolean);
const canonicalUrl = process.env.COOKBOOK_CANONICAL_URL || null;

const plugins = [
  // Resolve node modules in addition to local modules.
  nodeResolve({
    browser: true,
  }),

  typescript({
    tsconfig: `./tsconfig.json`,
    rootDir: `./src`,
    noEmitOnError: false,
    declaration: false,
    sourceMap: false,
  }),

  // Rollup only resolves ES2015 modules by default, so make it work with
  // CommonJS modules too.
  commonjs({
    exclude: [`./src/**`],
  }),

  // Replace process.env.NODE_ENV with the current environment, to allow some
  // packages to use production versions.
  replace({
    // Replace even when value is assigned to (we want errors).
    preventAssignment: false,
    values: {
      'process.env.NODE_ENV': JSON.stringify(env),
      'IS_DEV': JSON.stringify(isDev),
      'BASE_PATH': JSON.stringify(basePath),
      'REPO_URL': JSON.stringify(repoUrl),
      'TRUSTED_HOSTS': JSON.stringify(trustedHosts),
      'CANONICAL_URL': JSON.stringify(canonicalUrl),
    },
  }),

  // Allow JSON files to be imported as modules.
  json({
    compact: true,
  }),

  !isDev && terser(),
].filter(Boolean);

const localDepPattern = /^\.\.?\//;

const external = () => {
  const dependencies = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]);

  const devDependencies = new Set(Object.keys(pkg.devDependencies || {}));

  const isDependency = (deps, id) => {
    if (!localDepPattern.test(id)) {
      if (deps.has(id)) {
        return true;
      }

      for (const dep of deps) {
        // Catch submodule imports like `react/jsx-runtime`.
        if (id.startsWith(`${dep}/`)) {
          return true;
        }
      }
    }
    return false;
  };

  return id => {
    return (
      isDependency(dependencies, id) ||
      isDependency(devDependencies, id) ||
      // weh
      id === 'fs/promises'
    );
  };
};

const assetRel = kind => {
  switch (kind) {
    case 'css':
      return 'stylesheet';
    default:
      console.warn(`Unknown asset kind: ${kind}`);
      return '';
  }
};

// The PostCSS plugin does not support `[hash]` in the fileName :(
// For production builds, generate a random name.
const randomCssHash = () => Math.random().toString(36).slice(2, 8);

export default [
  // Frontend
  {
    input: './src/web/index.tsx',
    output: {
      format: 'iife',
      exports: 'none',
      sourcemap: false,
      dir: './public',
      entryFileNames: `assets/index.${isDev ? 'dev' : '[hash:6]'}.js`,
    },
    plugins: [
      ...plugins,
      postcss({
        minimize: !isDev,
        extract: `assets/index.${isDev ? 'dev' : randomCssHash()}.css`,
        sourceMap: false,
        plugins: [postcssNested()],
      }),
      html({
        publicPath: basePath,
        fileName: 'index.html',
        template: ({files}) => {
          let entries = [];
          let assets = [];
          for (const [kind, chunks] of Object.entries(files)) {
            for (const chunk of chunks) {
              const uri = `${basePath}/${chunk.fileName}`;
              if (chunk.isEntry) {
                entries.push(`<script src="${uri}"></script>`);
              } else {
                assets.push(`<link rel="${assetRel(kind)}" href="${uri}">`);
              }
            }
          }

          const src = readFileSync('./src/index.html', {encoding: 'utf-8'});
          const varPattern = /(^[ \t]*)?__([A-Z0-9_]+)__/gi;
          return src.replace(varPattern, (_m, indent, name) => {
            indent = indent || '';
            switch (name) {
              case 'ASSETS':
                return assets.map(tag => indent + tag).join('\n');
              case 'ENTRIES':
                return entries.map(tag => indent + tag).join('\n');
              case 'BASE_PATH':
                return indent + basePath;
              default:
                console.warn('Unknown variable in HTML template:', name);
                return indent;
            }
          });
        },
      }),
    ],
  },
  // Server-side components (run in Node)
  {
    input: './src/gen/index.ts',
    output: {
      format: 'cjs',
      exports: 'none',
      sourcemap: false,
      file: './bin/recipe-gen.js',
    },
    plugins,
    external: external(),
  },
];
