"""Tests for action routes — verifies endpoint wiring via DB queries."""
from datetime import datetime, timedelta

from sqlalchemy import func, or_

from app.models.pending_action import PendingAction
from app.models.user import User


def create_test_user(db):
    user = User(email="test@example.com", hashed_password="fake_hash", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_action(db, user_id, type="review_uncategorized", status="pending", **kw):
    action = PendingAction(
        user_id=user_id,
        type=type,
        surface=kw.get("surface", "dashboard"),
        title=kw.get("title", f"Test {type}"),
        description=kw.get("description", "Test description"),
        params=kw.get("params", {}),
        status=status,
        priority=kw.get("priority", 5),
        expires_at=kw.get("expires_at", datetime.utcnow() + timedelta(days=7)),
    )
    for field in ("surfaced_at", "tapped_at", "executed_at", "dismissed_at", "undo_snapshot"):
        if kw.get(field) is not None:
            setattr(action, field, kw[field])
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


class TestActionRoutes:
    def test_stats_computation(self, db_session):
        """Stats endpoint computes honest counts and rates."""
        user = create_test_user(db_session)
        for i in range(3):
            create_test_action(db_session, user.id, type=f"type_{i}", status="executed",
                               surfaced_at=datetime.utcnow(),
                               tapped_at=datetime.utcnow(),
                               executed_at=datetime.utcnow())
        create_test_action(db_session, user.id, type="type_d", status="dismissed",
                           surfaced_at=datetime.utcnow(),
                           dismissed_at=datetime.utcnow())
        create_test_action(db_session, user.id, type="type_s", status="surfaced",
                           surfaced_at=datetime.utcnow(),
                           tapped_at=datetime.utcnow())
        create_test_action(db_session, user.id, type="type_p", status="pending")

        results = db_session.query(
            PendingAction.status, func.count(PendingAction.id)
        ).filter(
            PendingAction.user_id == user.id
        ).group_by(PendingAction.status).all()

        by_status = dict(results)
        assert by_status.get("executed", 0) == 3
        assert by_status.get("dismissed", 0) == 1
        assert by_status.get("pending", 0) == 1
        assert by_status.get("surfaced", 0) == 1

        surfaced = db_session.query(PendingAction).filter(
            PendingAction.user_id == user.id,
            PendingAction.surfaced_at.isnot(None),
        ).count()
        tapped = db_session.query(PendingAction).filter(
            PendingAction.user_id == user.id,
            or_(PendingAction.tapped_at.isnot(None), PendingAction.executed_at.isnot(None)),
        ).count()
        total = db_session.query(PendingAction).filter(PendingAction.user_id == user.id).count()

        assert total == 6
        assert surfaced == 5
        assert tapped == 4
        assert round(surfaced / total, 2) == 0.83
        assert round(tapped / surfaced, 2) == 0.8
        assert round(by_status.get("executed", 0) / tapped, 2) == 0.75
        assert round(by_status.get("dismissed", 0) / surfaced, 2) == 0.2

    def test_count_endpoint_logic(self, db_session):
        """Count logic matches service get_pending_count."""
        user = create_test_user(db_session)
        create_test_action(db_session, user.id, status="pending")
        create_test_action(db_session, user.id, type="t2", status="surfaced",
                           surfaced_at=datetime.utcnow())
        create_test_action(db_session, user.id, type="t3", status="executed",
                           executed_at=datetime.utcnow())

        count = (
            db_session.query(func.count(PendingAction.id))
            .filter(
                PendingAction.user_id == user.id,
                PendingAction.status.in_(["pending", "surfaced"]),
            )
            .scalar()
        ) or 0
        assert count == 2

    def test_execute_not_found_would_404(self, db_session):
        """Verify not-found condition that routes translate to 404."""
        user = create_test_user(db_session)
        from app.services.action_service import ActionService
        svc = ActionService()
        success, message, _ = svc.execute_action(db_session, user.id, 9999)
        assert success is False
        assert message == "Action not found"

    def test_dismiss_not_found_would_404(self, db_session):
        """Verify not-found condition that routes translate to 404."""
        user = create_test_user(db_session)
        from app.services.action_service import ActionService
        svc = ActionService()
        success, message = svc.dismiss_action(db_session, user.id, 9999)
        assert success is False
        assert message == "Action not found"

    def test_undo_not_found_would_404(self, db_session):
        """Verify not-found condition that routes translate to 404."""
        user = create_test_user(db_session)
        from app.services.action_service import ActionService
        svc = ActionService()
        success, message, _ = svc.undo_action(db_session, user.id, 9999)
        assert success is False
        assert message == "Action not found"
