// Copy the install guide (and the built MCP file, for Claude Desktop users who
// cannot use the Claude Code plugin) into the CES Academy site
// (ces-academy/public/mcp/). Run after `pnpm run build`, then deploy ces-academy.
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.resolve(root, '..', 'ces-academy', 'public', 'mcp');

await mkdir(target, { recursive: true });
await copyFile(
  path.join(root, 'plugins', 'ces-academy', 'dist', 'ces-academy-mcp.mjs'),
  path.join(target, 'ces-academy-mcp.mjs'),
);
await copyFile(path.join(root, 'huong-dan-cai-dat.md'), path.join(target, 'huong-dan-cai-dat.md'));
console.log(`Copied MCP bundle + guide to ${target}`);
