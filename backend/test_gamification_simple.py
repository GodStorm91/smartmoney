#!/usr/bin/env python
"""Simple test script for gamification features"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.gamification import UserGamification, Achievement, UserAchievement, XPEvent
from app.models.transaction import Base

# Create a test database
engine = create_engine("sqlite:///test_gamification.db", echo=False)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
db = Session()


def test_gamification():
    print("Testing Gamification System...")

    # Create a test user gamification record
    user_gamification = UserGamification(user_id=1)
    db.add(user_gamification)
    db.commit()

    print(f"✅ Created user gamification record")
    print(f"   Level: {user_gamification.current_level}")
    print(f"   XP: {user_gamification.total_xp}")

    # Create some achievements
    achievements = [
        Achievement(
            code="first_login",
            name="First Login",
            description="Welcome to SmartMoney!",
            category="getting_started",
            xp_reward=10,
            icon="🎉",
            rarity="common",
        ),
        Achievement(
            code="week_warrior",
            name="Week Warrior",
            description="7 day login streak",
            category="consistency",
            xp_reward=50,
            icon="🔥",
            rarity="common",
        ),
        Achievement(
            code="savings_starter",
            name="Savings Starter",
            description="Save your first ¥10,000",
            category="savings",
            xp_reward=100,
            icon="💰",
            rarity="common",
        ),
    ]

    for achievement in achievements:
        db.add(achievement)
    db.commit()

    print(f"✅ Created {len(achievements)} achievements")

    # Award some XP
    user_gamification.total_xp = 150
    user_gamification.current_level = user_gamification.calculate_level()
    db.commit()

    print(f"✅ Awarded XP")
    print(f"   New Level: {user_gamification.current_level}")
    print(f"   Total XP: {user_gamification.total_xp}")
    print(f"   XP to next level: {user_gamification.xp_to_next_level()}")

    # Unlock an achievement
    user_achievement = UserAchievement(user_id=1, achievement_id=achievements[0].id, progress=100)
    db.add(user_achievement)
    db.commit()

    print(f"✅ Unlocked achievement: {achievements[0].name}")

    # Create XP event
    xp_event = XPEvent(
        user_id=1, action="first_login", xp_earned=10, event_metadata={"timestamp": "2024-01-14"}
    )
    db.add(xp_event)
    db.commit()

    print(f"✅ Created XP event")

    # Query and display results
    print("\n📊 Summary:")
    total_achievements = db.query(Achievement).count()
    unlocked_achievements = db.query(UserAchievement).filter_by(user_id=1).count()
    print(f"   Achievements: {unlocked_achievements}/{total_achievements}")
    print(f"   Current Level: {user_gamification.current_level}")
    print(f"   Total XP: {user_gamification.total_xp}")

    db.close()
    print("\n✅ Gamification test completed successfully!")

    # Clean up test database
    os.remove("test_gamification.db")


if __name__ == "__main__":
    test_gamification()
