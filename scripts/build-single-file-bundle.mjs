// Bundle the MCP server into ONE file inside the Claude Code plugin
// (plugins/ces-academy/dist/ces-academy-mcp.mjs): the machine that runs Claude
// only needs Node 20+ and the plugin, no pnpm install. The version comes from
// the plugin manifest (the version Claude Code compares when updating) and must
// match package.json.
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const plugin = JSON.parse(await readFile('plugins/ces-academy/.claude-plugin/plugin.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (plugin.version !== pkg.version) {
  console.error(`Version mismatch: plugin.json ${plugin.version} vs package.json ${pkg.version}. Set both to the same value.`);
  process.exit(1);
}

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'plugins/ces-academy/dist/ces-academy-mcp.mjs',
  legalComments: 'none',
  define: { __CES_ACADEMY_MCP_VERSION__: JSON.stringify(plugin.version) },
  // Some bundled dependencies are CommonJS and call require() for Node
  // built-ins; an ESM bundle has no require, so provide one.
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __cesCreateRequire } from 'node:module';\nconst require = __cesCreateRequire(import.meta.url);",
  },
});
console.log(`Built plugins/ces-academy/dist/ces-academy-mcp.mjs (v${plugin.version})`);
