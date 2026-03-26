"""Spot-check categorization accuracy — Phase 0 gate.

Run: cd backend && uv run python scripts/spot_check_accuracy.py
"""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.transaction import Transaction


def main():
    db = SessionLocal()
    try:
        txns = db.query(Transaction).order_by(Transaction.date.desc()).limit(50).all()
        if not txns:
            print("No transactions found.")
            return

        correct = 0
        incorrect = 0
        skipped = 0

        for i, tx in enumerate(txns, 1):
            print(f"\n[{i}/{len(txns)}] {tx.date} | {tx.description}")
            print(f"  Amount: {tx.amount:,} | Category: {tx.category}")

            while True:
                answer = input("  [C]orrect / [I]ncorrect / [S]kip? ").strip().lower()
                if answer in ('c', 'i', 's'):
                    break
                print("  Please enter C, I, or S")

            if answer == 'c':
                correct += 1
            elif answer == 'i':
                incorrect += 1
            else:
                skipped += 1

        total = correct + incorrect
        if total == 0:
            print("\nNo rated transactions. Cannot compute accuracy.")
            return

        accuracy = correct / total * 100
        threshold = 85
        status = "PASS" if accuracy >= threshold else "FAIL"

        print(f"\n{'='*40}")
        print(f"Results: {correct}/{total} correct ({accuracy:.1f}%)")
        print(f"Skipped: {skipped}")
        print(f"Threshold: {threshold}%")
        print(f"Status: {status}")
        print(f"{'='*40}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
