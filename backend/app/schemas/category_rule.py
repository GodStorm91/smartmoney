"""Pydantic schemas for category rules."""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MatchType(str, Enum):
    """Match types for category rules."""

    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    EXACT = "exact"


class CategoryRuleBase(BaseModel):
    """Base schema for category rules."""

    keyword: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=100)
    match_type: MatchType = MatchType.CONTAINS
    priority: int = Field(0, ge=0, le=100, description="Higher = checked first")


class CategoryRuleCreate(CategoryRuleBase):
    """Schema for creating a category rule."""

    pass


class CategoryRuleUpdate(BaseModel):
    """Schema for updating a category rule."""

    keyword: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    match_type: Optional[MatchType] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class CategoryRuleResponse(CategoryRuleBase):
    """Schema for category rule response."""

    id: int
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class CategoryRuleListResponse(BaseModel):
    """Schema for list of category rules."""

    rules: list[CategoryRuleResponse]
    total: int


class ApplyRulesRequest(BaseModel):
    """Schema for applying rules to existing transactions."""

    dry_run: bool = Field(True, description="If true, only preview changes without applying")


class ApplyRulesResponse(BaseModel):
    """Schema for apply rules response."""

    affected_count: int
    preview: Optional[list[dict]] = None  # Only if dry_run=True


class SuggestRulesResponse(BaseModel):
    """Schema for suggested rules based on 'Other' transactions."""

    suggestions: list[dict]  # [{keyword, suggested_category, count}]
