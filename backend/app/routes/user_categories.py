"""User category API routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.user_category import UserCategoryCreate, UserCategoryUpdate, UserCategoryResponse
from ..services.user_category_service import UserCategoryService

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryUpdateResponse(BaseModel):
    """Response for category update with cascade info."""
    category: UserCategoryResponse
    affected_transactions: int


@router.get("/", response_model=list[UserCategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all custom categories for the user."""
    return UserCategoryService.get_all(db, current_user.id)


@router.post("/", response_model=UserCategoryResponse, status_code=201)
async def create_category(
    data: UserCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom category."""
    try:
        existing = UserCategoryService.get_by_name(db, current_user.id, data.name)
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{data.name}' already exists")

        return UserCategoryService.create(db, current_user.id, data.model_dump())
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Category already exists")


@router.patch("/{category_id}", response_model=CategoryUpdateResponse)
async def update_category(
    category_id: int,
    data: UserCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a custom category.
    Name changes cascade to all transactions with the old category name.
    """
    # Check if new name already exists (if changing name)
    if data.name:
        existing = UserCategoryService.get_by_name(db, current_user.id, data.name)
        if existing and existing.id != category_id:
            raise HTTPException(status_code=400, detail=f"Category '{data.name}' already exists")

    category, affected_count = UserCategoryService.update(
        db,
        current_user.id,
        category_id,
        data.model_dump(exclude_unset=True),
        cascade_to_transactions=True
    )

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryUpdateResponse(
        category=UserCategoryResponse.model_validate(category),
        affected_transactions=affected_count
    )


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom category."""
    if not UserCategoryService.delete(db, current_user.id, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return None
