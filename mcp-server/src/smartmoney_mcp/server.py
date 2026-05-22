"""SmartMoney MCP server entrypoint (streamable-http transport)."""
from fastmcp import FastMCP

from .config import MCP_HOST, MCP_PATH, MCP_PORT
from .tools import register_read_tools

mcp = FastMCP("smartmoney")
register_read_tools(mcp)


def main() -> None:
    """Run the server over streamable-http for remote OpenClaw clients.

    access_log is disabled: the token rides in the ?token= query string, so the
    default uvicorn access line ("GET /mcp?token=<JWT> ...") would leak the
    long-lived token into the container log. nginx already disables its own
    access_log for /mcp — this closes the upstream half.
    """
    mcp.run(
        transport="http",
        host=MCP_HOST,
        port=MCP_PORT,
        path=MCP_PATH,
        uvicorn_config={"access_log": False},
    )


if __name__ == "__main__":
    main()
