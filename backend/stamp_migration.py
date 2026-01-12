#!/usr/bin/env python3
"""Stamp the database with the latest migration revision."""

import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from alembic.config import Config
from alembic import command

# The latest revision is the last one in the chain
LATEST_REVISION = "2601071300"

alembic_cfg = Config("/app/alembic/alembic.ini")
alembic_cfg.set_main_option("script_location", "/app/alembic")
command.stamp(alembic_cfg, LATEST_REVISION)
print(f"Stamped database with revision: {LATEST_REVISION}")
