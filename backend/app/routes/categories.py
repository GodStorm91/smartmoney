"""Category API routes with hierarchy support."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.category import Category
from ..models.user import User
from ..schemas.category import (
    CategoryTreeResponse,
    CategoryParent,
    CategoryChild,
    CreateCategoryRequest,
    CategoryResponse,
)

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=CategoryTreeResponse)
def get_category_tree(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get hierarchical category tree.

    Returns system categories + user's custom categories.
    """
    # Get all parent categories (system only)
    parents = db.query(Category).filter(
        Category.parent_id == None,
        Category.is_system == True
    ).order_by(Category.display_order).all()

    expense_tree = []
    income_tree = []

    for parent in parents:
        # Get children: system + user's custom
        children = db.query(Category).filter(
            Category.parent_id == parent.id,
            (Category.is_system == True) | (Category.user_id == current_user.id)
        ).order_by(Category.display_order, Category.name).all()

        parent_data = CategoryParent(
            id=parent.id,
            name=parent.name,
            icon=parent.icon,
            type=parent.type,
            children=[CategoryChild(
                id=c.id,
                name=c.name,
                icon=c.icon,
                is_system=c.is_system
            ) for c in children]
        )

        if parent.type == "expense":
            expense_tree.append(parent_data)
        else:
            income_tree.append(parent_data)

    return CategoryTreeResponse(expense=expense_tree, income=income_tree)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_custom_category(
    request: CreateCategoryRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Create custom child category under a parent."""
    # Verify parent exists and is a parent category
    parent = db.query(Category).filter(
        Category.id == request.parent_id,
        Category.parent_id == None,
        Category.is_system == True
    ).first()

    if not parent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid parent category"
        )

    # Check for duplicate
    existing = db.query(Category).filter(
        Category.parent_id == request.parent_id,
        Category.name == request.name,
        (Category.is_system == True) | (Category.user_id == current_user.id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists"
        )

    # Create custom category
    category = Category(
        name=request.name,
        icon=request.icon,
        type=parent.type,
        parent_id=request.parent_id,
        is_system=False,
        user_id=current_user.id,
        display_order=99
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_category(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Delete custom category. Cannot delete system categories."""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id,
        Category.is_system == False
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or cannot be deleted"
        )

    # Get parent's "Misc" child for reassignment
    misc_child = db.query(Category).filter(
        Category.parent_id == category.parent_id,
        Category.name == "Misc",
        Category.is_system == True
    ).first()

    # Reassign transactions to Misc (or first system child)
    if not misc_child:
        misc_child = db.query(Category).filter(
            Category.parent_id == category.parent_id,
            Category.is_system == True
        ).first()

    if misc_child:
        from ..models.transaction import Transaction
        db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category == category.name
        ).update({"category": misc_child.name})

    db.delete(category)
    db.commit()


@router.get("/parent/{child_name}", response_model=str)
def get_parent_for_category(
    child_name: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get parent category name for a child category name.

    Used for budget rollup calculations.
    """
    # Find child by name
    child = db.query(Category).filter(
        Category.name == child_name,
        Category.parent_id != None,
        (Category.is_system == True) | (Category.user_id == current_user.id)
    ).first()

    if child and child.parent:
        return child.parent.name

    # If not found as child, check if it's already a parent
    parent = db.query(Category).filter(
        Category.name == child_name,
        Category.parent_id == None
    ).first()

    if parent:
        return parent.name

    return "Other"
