"""Category rules API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.category_rule import (
    CategoryRuleCreate,
    CategoryRuleUpdate,
    CategoryRuleResponse,
    CategoryRuleListResponse,
    ApplyRulesRequest,
    ApplyRulesResponse,
    SuggestRulesResponse,
)
from ..services.category_rule_service import CategoryRuleService

router = APIRouter(prefix="/api/category-rules", tags=["category-rules"])


@router.post("/", response_model=CategoryRuleResponse, status_code=201)
async def create_rule(
    data: CategoryRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new category rule."""
    rule = CategoryRuleService.create_rule(
        db=db,
        user_id=current_user.id,
        data=data.model_dump(),
    )
    return _to_response(rule)


@router.get("/", response_model=CategoryRuleListResponse)
async def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all category rules for the current user."""
    rules = CategoryRuleService.list_rules(db=db, user_id=current_user.id)
    return {
        "rules": [_to_response(r) for r in rules],
        "total": len(rules),
    }


@router.get("/{rule_id}", response_model=CategoryRuleResponse)
async def get_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single category rule by ID."""
    rule = CategoryRuleService.get_rule(db=db, user_id=current_user.id, rule_id=rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Category rule not found")
    return _to_response(rule)


@router.patch("/{rule_id}", response_model=CategoryRuleResponse)
async def update_rule(
    rule_id: int,
    data: CategoryRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a category rule."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    rule = CategoryRuleService.update_rule(
        db=db,
        user_id=current_user.id,
        rule_id=rule_id,
        update_data=update_data,
    )

    if not rule:
        raise HTTPException(status_code=404, detail="Category rule not found")

    return _to_response(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a category rule."""
    deleted = CategoryRuleService.delete_rule(
        db=db,
        user_id=current_user.id,
        rule_id=rule_id,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Category rule not found")

    return None


@router.post("/apply", response_model=ApplyRulesResponse)
async def apply_rules(
    data: ApplyRulesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply rules to existing 'Other' transactions."""
    result = CategoryRuleService.apply_rules_to_transactions(
        db=db,
        user_id=current_user.id,
        dry_run=data.dry_run,
    )
    return result


@router.get("/suggest", response_model=SuggestRulesResponse)
async def suggest_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest rules based on 'Other' transactions."""
    suggestions = CategoryRuleService.suggest_rules(db=db, user_id=current_user.id)
    return {"suggestions": suggestions}


@router.post("/seed-defaults", response_model=dict)
async def seed_defaults(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Seed default category rules for the current user."""
    created = CategoryRuleService.seed_default_rules(db=db, user_id=current_user.id)
    return {"created": created, "message": f"Created {created} default rules"}


def _to_response(rule) -> dict:
    """Convert CategoryRule model to response dict."""
    return {
        "id": rule.id,
        "keyword": rule.keyword,
        "category": rule.category,
        "match_type": rule.match_type,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat(),
    }
