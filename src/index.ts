// ============================================================
// ces-academy-mcp - MCP server (stdio) for Claude Code / Claude Desktop.
// Publishes finished books to CES Academy. Shipped as the Claude Code plugin
// "ces-academy" (plugins/ces-academy), which fills these from its options:
//   CES_ACADEMY_API_KEY  key from Academy admin > Kết nối MCP (required)
//   CES_ACADEMY_API_URL  CES API base, default https://lms-api.cesglobal.com.vn/api
// ============================================================

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfigFromEnv } from './academy-api-client.js';
import { registerAcademyBookTools } from './academy-book-tools.js';
import { MCP_VERSION } from './mcp-version.js';

const server = new McpServer(
  { name: 'ces-academy', version: MCP_VERSION },
  {
    instructions:
      'Đăng sách đã viết xong lên CES Academy. Quy trình: academy_status (xem chế độ) -> academy_list_books (tránh trùng) '
      + '-> academy_publish_book với đường dẫn PDF / ảnh bìa / video trên máy. Sửa theo góp ý bằng academy_update_book. '
      + 'Sách mặc định miễn phí; chỉ đặt access_tier = premium khi người dùng yêu cầu. Báo lại người dùng link trang sách và trạng thái.',
  },
);

const config = readConfigFromEnv();
registerAcademyBookTools(server, config);

// One line in the MCP log (stderr, never stdout: stdout is the protocol) so a
// support check shows which build, server and key a machine runs. Only the
// first 12 characters of the key, the same prefix the admin panel lists.
process.stderr.write(
  `ces-academy-mcp v${MCP_VERSION}, API ${config.apiUrl}, `
    + `${config.apiKey ? `khóa ${config.apiKey.slice(0, 12)}...` : 'chưa có khóa'}\n`,
);

await server.connect(new StdioServerTransport());
