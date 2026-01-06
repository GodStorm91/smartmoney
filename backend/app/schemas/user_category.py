"""User category schemas."""
from typing import Optional
from pydantic import BaseModel, Field


class UserCategoryCreate(BaseModel):
    """Schema for creating a user category."""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str = Field(default="📁", max_length=10)
    type: str = Field(default="expense", pattern="^(expense|income)$")


class UserCategoryUpdate(BaseModel):
    """Schema for updating a user category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=10)


class UserCategoryResponse(BaseModel):
    """Schema for user category response."""
    id: int
    name: str
    icon: str
    type: str

    class Config:
        from_attributes = True
