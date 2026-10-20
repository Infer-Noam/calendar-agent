import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "@core/llm/tools.js";
import type { ToolContext } from "@core/llm/type/tool.type.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../const/mcpServer.const.js";

export const buildMcpServer = (context: ToolContext): Server => {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(TOOLS).map(({ schema }) => ({
      name: schema.name,
      description: schema.description,
      inputSchema: schema.input_schema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolDefinition = TOOLS[request.params.name];

    if (!toolDefinition) {
      return {
        content: [{ type: "text", text: `Error: unknown tool "${request.params.name}"` }],
        isError: true,
      };
    }

    const result = await toolDefinition.run(context, request.params.arguments);

    return { content: [{ type: "text", text: result.content }] };
  });

  return server;
};
