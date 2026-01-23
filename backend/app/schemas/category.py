"""Category schemas."""
from pydantic import BaseModel, Field


class CategoryChild(BaseModel):
    """Child category in hierarchy."""
    id: int
    name: str
    icon: str
    is_system: bool

    class Config:
        from_attributes = True


class CategoryParent(BaseModel):
    """Parent category with children."""
    id: int
    name: str
    icon: str
    type: str
    children: list[CategoryChild] = []

    class Config:
        from_attributes = True


class CategoryTreeResponse(BaseModel):
    """Full category tree response."""
    expense: list[CategoryParent]
    income: list[CategoryParent]


class CreateCategoryRequest(BaseModel):
    """Request to create custom child category."""
    name: str = Field(min_length=1, max_length=100)
    icon: str = Field(default="📁", max_length=10)
    parent_id: int
    type: str = Field(default="expense", pattern="^(expense|income)$")


class CategoryResponse(BaseModel):
    """Single category response."""
    id: int
    name: str
    icon: str
    type: str
    parent_id: int | None
    is_system: bool

    class Config:
        from_attributes = True
