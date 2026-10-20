import "dotenv/config";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { resolveToolContext } from "./service/mcpRequestAuth.service.js";
import { buildMcpServer } from "./service/mcpServer.service.js";
import { MCP_PATH, DEFAULT_MCP_PORT } from "./const/mcpServer.const.js";

const app = express();

app.use(express.json());

app.post(MCP_PATH, async (req, res) => {
  const context = await resolveToolContext(req.get("authorization"));

  if (!context) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }

  const server = buildMcpServer(context);

  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error("MCP request failed:", err);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get(MCP_PATH, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

const port = Number(process.env.PORT) || DEFAULT_MCP_PORT;

app.listen(port, () => console.log(`MCP server listening on port ${port}`));
