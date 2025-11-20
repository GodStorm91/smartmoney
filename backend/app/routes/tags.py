"""Tag API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.tag import TagCreate, TagResponse, TagUpdate
from ..services.tag_service import TagService

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    tag: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new tag."""
    try:
        # Check if tag with this name already exists for this user
        existing = TagService.get_tag_by_name(db, current_user.id, tag.name)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Tag '{tag.name}' already exists"
            )

        tag_data = tag.model_dump()
        tag_data["user_id"] = current_user.id
        created = TagService.create_tag(db, tag_data)
        return created
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail=f"Tag '{tag.name}' already exists"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[TagResponse])
async def get_all_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all tags."""
    return TagService.get_all_tags(db, current_user.id)


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a tag by ID."""
    tag = TagService.get_tag(db, current_user.id, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_update: TagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a tag."""
    try:
        # If updating name, check if new name already exists for this user
        if tag_update.name:
            existing = TagService.get_tag_by_name(db, current_user.id, tag_update.name)
            if existing and existing.id != tag_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tag '{tag_update.name}' already exists"
                )

        updated = TagService.update_tag(
            db, current_user.id, tag_id, tag_update.model_dump(exclude_unset=True)
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Tag not found")
        return updated
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail=f"Tag name already exists"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a tag (cascades to transaction_tags)."""
    deleted = TagService.delete_tag(db, current_user.id, tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tag not found")
    return None
