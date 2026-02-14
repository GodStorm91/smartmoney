"""Theme settings schemas."""
from typing import Any
from pydantic import BaseModel, Field


class ThemeSettings(BaseModel):
    """Schema for user theme preferences."""

    theme_name: str = Field(default="catppuccin-mocha", description="Theme name identifier")
    accent_color: str = Field(default="#89b4fa", description="Accent color in hex format")
    font_size: str = Field(default="medium", description="Font size preference (small/medium/large)")
    other_preferences: dict[str, Any] = Field(default_factory=dict, description="Additional UI preferences")

    class Config:
        from_attributes = True


class ThemeSettingsUpdate(BaseModel):
    """Schema for updating theme settings (all fields optional)."""

    theme_name: str | None = None
    accent_color: str | None = None
    font_size: str | None = None
    other_preferences: dict[str, Any] | None = None
