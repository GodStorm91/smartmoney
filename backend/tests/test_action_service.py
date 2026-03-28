"""Tests for ActionService — surface, execute, dismiss, undo, expiry, dedup."""
from datetime import datetime, timedelta

from app.models.pending_action import PendingAction
from app.models.report_ai_summary import ReportAISummary
from app.models.user import User
from app.services.action_generators import generate_monthly_report_nudge
from app.services.action_service import ActionService


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


def freeze_action_generator_now(monkeypatch, frozen_now: datetime):
    class FrozenDateTime(datetime):
        @classmethod
        def utcnow(cls):
            return cls(
                frozen_now.year,
                frozen_now.month,
                frozen_now.day,
                frozen_now.hour,
                frozen_now.minute,
                frozen_now.second,
                frozen_now.microsecond,
            )

    monkeypatch.setattr("app.services.action_generators.datetime", FrozenDateTime)


class TestActionService:
    def test_surface_marks_surfaced(self, db_session):
        """surface_actions sets surfaced_at timestamp."""
        user = create_test_user(db_session)
        create_test_action(db_session, user.id)
        svc = ActionService()
        result = svc.surface_actions(db_session, user.id)
        assert len(result) == 1
        assert result[0].status == "surfaced"
        assert result[0].surfaced_at is not None

    def test_surface_with_filter(self, db_session):
        """surface_actions filters by surface param."""
        user = create_test_user(db_session)
        create_test_action(db_session, user.id, surface="dashboard")
        create_test_action(db_session, user.id, type="copy_or_create_budget", surface="budget_page")
        svc = ActionService()
        result = svc.surface_actions(db_session, user.id, surface="budget_page")
        assert len(result) == 1
        assert result[0].type == "copy_or_create_budget"

    def test_execute_success(self, db_session):
        """execute_action marks action as executed."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="surfaced",
                                    surfaced_at=datetime.utcnow())
        svc = ActionService()
        success, _, _ = svc.execute_action(db_session, user.id, action.id)
        assert success is True
        assert action.status == "executed"
        assert action.tapped_at is not None
        assert action.executed_at is not None

    def test_surface_weekly_cap_blocks_new_surfacing(self, db_session):
        """A recent surfacing blocks new actions from being surfaced."""
        user = create_test_user(db_session)
        create_test_action(
            db_session,
            user.id,
            type="previous_action",
            status="executed",
            surfaced_at=datetime.utcnow() - timedelta(days=1),
            executed_at=datetime.utcnow() - timedelta(days=1),
        )
        new_action = create_test_action(db_session, user.id, type="copy_or_create_budget")

        svc = ActionService()
        result = svc.surface_actions(db_session, user.id)

        db_session.refresh(new_action)
        assert result == []
        assert new_action.status == "pending"
        assert new_action.surfaced_at is None

    def test_execute_idempotent(self, db_session):
        """Double execute returns success both times."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="surfaced",
                                    surfaced_at=datetime.utcnow())
        svc = ActionService()
        svc.execute_action(db_session, user.id, action.id)
        success, msg, _ = svc.execute_action(db_session, user.id, action.id)
        assert success is True
        assert "Already" in msg

    def test_tapped_at_persists_on_execute_failure(self, db_session, monkeypatch):
        """tapped_at is recorded even if the mutation itself fails."""
        user = create_test_user(db_session)
        action = create_test_action(
            db_session,
            user.id,
            type="copy_or_create_budget",
            status="surfaced",
            surfaced_at=datetime.utcnow(),
            params={"month": "2026-03"},
        )

        def fail_execute_mutation(db, pending_action):
            raise RuntimeError("mutation exploded")

        monkeypatch.setattr(
            "app.services.action_lifecycle_ops.execute_mutation",
            fail_execute_mutation,
        )

        svc = ActionService()
        success, msg, undo = svc.execute_action(db_session, user.id, action.id)

        db_session.refresh(action)
        assert success is False
        assert undo is False
        assert "mutation exploded" in msg
        assert action.tapped_at is not None
        assert action.status == "surfaced"
        assert action.executed_at is None

    def test_execute_not_found(self, db_session):
        """execute_action with invalid ID returns failure."""
        user = create_test_user(db_session)
        svc = ActionService()
        success, _, _ = svc.execute_action(db_session, user.id, 9999)
        assert success is False

    def test_execute_stores_snapshot(self, db_session):
        """Budget actions store undo_snapshot."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, type="copy_or_create_budget",
                                    status="surfaced", surfaced_at=datetime.utcnow(),
                                    params={"month": "2026-03"})
        svc = ActionService()
        success, _, _ = svc.execute_action(db_session, user.id, action.id)
        assert success is True
        assert action.status == "executed"

    def test_dismiss_success(self, db_session):
        """dismiss_action sets status and timestamp."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="surfaced",
                                    surfaced_at=datetime.utcnow())
        svc = ActionService()
        success, _ = svc.dismiss_action(db_session, user.id, action.id)
        assert success is True
        assert action.status == "dismissed"
        assert action.dismissed_at is not None

    def test_dismiss_not_found(self, db_session):
        """dismiss_action with invalid ID returns failure."""
        user = create_test_user(db_session)
        svc = ActionService()
        success, _ = svc.dismiss_action(db_session, user.id, 9999)
        assert success is False

    def test_undo_within_window(self, db_session):
        """Undo within 24h reverts action."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="executed",
                                    executed_at=datetime.utcnow(),
                                    undo_snapshot={"test": True})
        svc = ActionService()
        success, _, _ = svc.undo_action(db_session, user.id, action.id)
        assert success is True
        assert action.status == "undone"
        assert action.undone_at is not None

    def test_undo_expired_window(self, db_session):
        """Undo after 24h fails."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="executed",
                                    executed_at=datetime.utcnow() - timedelta(hours=25),
                                    undo_snapshot={"test": True})
        svc = ActionService()
        success, msg, _ = svc.undo_action(db_session, user.id, action.id)
        assert success is False
        assert "expired" in msg.lower()

    def test_undo_no_snapshot(self, db_session):
        """Undo without snapshot fails."""
        user = create_test_user(db_session)
        action = create_test_action(db_session, user.id, status="executed",
                                    executed_at=datetime.utcnow())
        svc = ActionService()
        success, msg, _ = svc.undo_action(db_session, user.id, action.id)
        assert success is False

    def test_expire_stale_actions(self, db_session):
        """expire_stale_actions changes status of expired actions."""
        user = create_test_user(db_session)
        create_test_action(db_session, user.id,
                           expires_at=datetime.utcnow() - timedelta(days=1))
        create_test_action(db_session, user.id, type="copy_or_create_budget",
                           expires_at=datetime.utcnow() + timedelta(days=5))
        svc = ActionService()
        count = svc.expire_stale_actions(db_session)
        assert count == 1

    def test_dedup_skips_existing(self, db_session):
        """has_active_action returns True when active action exists."""
        from app.services.action_guard_checks import has_active_action
        user = create_test_user(db_session)
        create_test_action(db_session, user.id, type="review_uncategorized")
        assert has_active_action(db_session, user.id, "review_uncategorized") is True
        assert has_active_action(db_session, user.id, "copy_or_create_budget") is False

    def test_cooldown_blocks_regen(self, db_session):
        """Dismissed action within 30 days blocks regeneration."""
        from app.services.action_guard_checks import is_in_cooldown
        user = create_test_user(db_session)
        create_test_action(db_session, user.id, type="review_uncategorized",
                           status="dismissed",
                           dismissed_at=datetime.utcnow() - timedelta(days=5))
        assert is_in_cooldown(db_session, user.id, "review_uncategorized") is True

    def test_auto_pause_after_3_dismissals(self, db_session):
        """3 dismissals in 30 days triggers auto-pause."""
        from app.services.action_guard_checks import is_auto_paused
        user = create_test_user(db_session)
        for i, t in enumerate(["review_uncategorized", "copy_or_create_budget",
                                "adjust_budget_category"]):
            create_test_action(db_session, user.id, type=t, status="dismissed",
                               dismissed_at=datetime.utcnow() - timedelta(days=i))
        assert is_auto_paused(db_session, user.id) is True

    def test_get_pending_count(self, db_session):
        """get_pending_count returns correct count."""
        user = create_test_user(db_session)
        create_test_action(db_session, user.id)
        create_test_action(db_session, user.id, type="copy_or_create_budget")
        create_test_action(db_session, user.id, type="adjust_budget_category",
                           status="executed")
        svc = ActionService()
        assert svc.get_pending_count(db_session, user.id) == 2

    def test_generate_monthly_report_nudge_uses_previous_month_summary(
        self, db_session, monkeypatch
    ):
        """Early-month nudges target the previous report and reuse cached AI copy."""
        freeze_action_generator_now(monkeypatch, datetime(2026, 4, 2, 9, 0, 0))
        monkeypatch.setattr(
            "app.services.action_generators.generate_action_copy",
            lambda action_type, params: (
                f"{params['monthName']} report is ready",
                params.get("summary", "fallback"),
            ),
        )
        user = create_test_user(db_session)
        summary = ReportAISummary(
            user_id=user.id,
            year=2026,
            month=3,
            language="en",
            win="Savings improved and dining spend was lower than February.",
            warning="Keep an eye on transport costs.",
            trend="Expenses are stabilizing.",
            credits_used=0.0,
        )
        db_session.add(summary)
        db_session.commit()

        created = generate_monthly_report_nudge(db_session, user.id)
        action = (
            db_session.query(PendingAction)
            .filter(
                PendingAction.user_id == user.id,
                PendingAction.type == "monthly_report_nudge",
            )
            .one()
        )

        assert created is True
        assert action.surface == "dashboard"
        assert action.priority == 4
        assert action.params["month"] == "2026-03"
        assert action.params["monthName"] == "March 2026"
        assert action.params["reportYear"] == 2026
        assert action.params["reportMonth"] == 3
        assert action.params["summary"] == summary.win
        assert action.description == summary.win

    def test_generate_monthly_report_nudge_skips_after_day_three(
        self, db_session, monkeypatch
    ):
        """Monthly report nudges only generate in the first three days of the month."""
        freeze_action_generator_now(monkeypatch, datetime(2026, 4, 4, 9, 0, 0))
        user = create_test_user(db_session)

        created = generate_monthly_report_nudge(db_session, user.id)
        count = (
            db_session.query(PendingAction)
            .filter(
                PendingAction.user_id == user.id,
                PendingAction.type == "monthly_report_nudge",
            )
            .count()
        )

        assert created is False
        assert count == 0
