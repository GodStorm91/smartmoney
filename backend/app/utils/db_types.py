"""Database type compatibility utilities."""
from sqlalchemy import JSON
from sqlalchemy.types import TypeDecorator


class JSONBCompat(TypeDecorator):
    """JSONB for PostgreSQL, falls back to JSON for SQLite.

    Use this instead of importing JSONB directly from
    sqlalchemy.dialects.postgresql so tests can run on SQLite.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
