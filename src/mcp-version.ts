// Version of this MCP build. The bundle script injects the version from
// plugins/ces-academy/.claude-plugin/plugin.json; `tsx src/index.ts` (dev) says "dev".
declare const __CES_ACADEMY_MCP_VERSION__: string | undefined;

export const MCP_VERSION: string =
  typeof __CES_ACADEMY_MCP_VERSION__ === 'string' ? __CES_ACADEMY_MCP_VERSION__ : 'dev';
