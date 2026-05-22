"""Runtime config from environment.

All values have dev-friendly defaults; production sets BACKEND_URL to the
in-network backend service (e.g. http://backend:8000).
"""
import os

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")
MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.environ.get("MCP_PORT", "3000"))
MCP_PATH = os.environ.get("MCP_PATH", "/mcp")
BACKEND_TIMEOUT = float(os.environ.get("BACKEND_TIMEOUT", "30"))
