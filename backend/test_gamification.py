#!/usr/bin/env python
"""Test script for gamification features"""

from app.database import SessionLocal
from app.services.gamification_service import GamificationService


def test_gamification():
    db = SessionLocal()
    service = GamificationService(db)

    # Initialize achievements
    print("Initializing achievements...")
    service.initialize_basic_achievements()

    # Test user ID (you would get this from auth in real app)
    test_user_id = 1

    # Test awarding XP
    print("\nTesting XP award...")
    result = service.award_xp(test_user_id, "daily_login")
    print(f"XP earned: {result['xp_earned']}, Total XP: {result['total_xp']}")

    # Test login streak
    print("\nTesting login streak...")
    streak_result = service.update_login_streak(test_user_id)
    print(
        f"Current streak: {streak_result['current_streak']}, XP earned: {streak_result['xp_earned']}"
    )

    # Get user stats
    print("\nGetting user stats...")
    stats = service.get_user_stats(test_user_id)
    print(
        f"Level: {stats['current_level']}, Total XP: {stats['total_xp']}, Streak: {stats['current_streak']}"
    )

    # Check achievements
    from app.models.gamification import Achievement

    achievements = db.query(Achievement).all()
    print(f"\nTotal achievements in database: {len(achievements)}")
    for achievement in achievements[:3]:  # Show first 3
        print(f"  - {achievement.name}: {achievement.description} ({achievement.xp_reward} XP)")

    db.close()
    print("\n✅ Gamification test completed successfully!")


if __name__ == "__main__":
    test_gamification()
