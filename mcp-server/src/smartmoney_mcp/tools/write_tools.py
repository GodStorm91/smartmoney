"""Write tools exposed to OpenClaw. Requires a Write MCP token (separate from read token).

Tools here trigger writes via backend endpoints whitelisted for the mcp_write token type.
Backend is sole auth authority — MCP only forwards.
"""
import base64

from fastmcp import FastMCP

from ..backend_client import backend_post_multipart


async def import_csv(
    source: str,
    csv_base64: str,
    filename: str = "import.csv",
) -> dict:
    """Import a CSV of transactions from a known source into SmartMoney.

    Requires a Write MCP token (generate in Settings → MCP Write Token).

    source: one of {"paypay"} (more sources coming). Determines which parser to use.
    csv_base64: base64-encoded CSV bytes (UTF-8 or UTF-8-with-BOM both supported).
    filename: optional, for backend logging only (default "import.csv").

    Returns {filename, total_rows, created, skipped, message}.
    """
    try:
        csv_bytes = base64.b64decode(csv_base64)
    except Exception as e:
        raise ValueError(f"csv_base64 is not valid base64: {e}")
    return await backend_post_multipart(
        "/api/upload/csv",
        files={"file": (filename, csv_bytes, "text/csv")},
        params={"source": source},
    )


def register_write_tools(mcp: FastMCP) -> None:
    """Attach all write tools to the given FastMCP instance."""
    mcp.tool()(import_csv)
