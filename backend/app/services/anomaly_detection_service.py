"""Anomaly detection service for detecting unusual transactions."""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

import numpy as np
from sqlalchemy.orm import Session

from ..models.anomaly import AnomalyAlert, AnomalyConfig


class AnomalyDetectionService:
    """Statistical and ML-based anomaly detection for transactions."""

    SENSITIVITY_SETTINGS = {
        "low": {"z_threshold": 3.0, "min_amount": 10000, "contamination": 0.05},
        "medium": {"z_threshold": 2.5, "min_amount": 5000, "contamination": 0.10},
        "high": {"z_threshold": 2.0, "min_amount": 1000, "contamination": 0.15},
    }

    def __init__(self, db: Session):
        self.db = db

    def get_user_config(self, user_id: int) -> AnomalyConfig | None:
        """Get user's anomaly detection configuration."""
        return self.db.query(AnomalyConfig).filter(AnomalyConfig.user_id == user_id).first()

    def get_or_create_config(self, user_id: int) -> AnomalyConfig:
        """Get user's config or create default if not exists."""
        config = self.get_user_config(user_id)
        if not config:
            config = AnomalyConfig(user_id=user_id)
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        return config

    def update_config(
        self,
        user_id: int,
        sensitivity: str | None = None,
        large_transaction_threshold: int | None = None,
        unusual_spending_percent: int | None = None,
        recurring_change_percent: int | None = None,
        duplicate_charge_hours: int | None = None,
        enabled_types: list[str] | None = None,
    ) -> AnomalyConfig:
        """Update user's anomaly detection configuration."""
        config = self.get_or_create_config(user_id)

        if sensitivity is not None:
            config.sensitivity = sensitivity
        if large_transaction_threshold is not None:
            config.large_transaction_threshold = large_transaction_threshold
        if unusual_spending_percent is not None:
            config.unusual_spending_percent = unusual_spending_percent
        if recurring_change_percent is not None:
            config.recurring_change_percent = recurring_change_percent
        if duplicate_charge_hours is not None:
            config.duplicate_charge_hours = duplicate_charge_hours
        if enabled_types is not None:
            config.enabled_types = enabled_types

        self.db.commit()
        self.db.refresh(config)
        return config

    async def detect_user_anomalies(
        self,
        user_id: int,
        transactions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Run comprehensive anomaly detection for a user.

        Args:
            user_id: User ID
            transactions: List of transaction dictionaries

        Returns:
            List of detected anomalies with severity and description
        """
        config = self.get_user_config(user_id)
        sensitivity = config.sensitivity if config else "medium"
        settings = self.SENSITIVITY_SETTINGS.get(sensitivity, self.SENSITIVITY_SETTINGS["medium"])

        enabled_types = (
            config.enabled_types if config else ["large_transaction", "category_shift", "duplicate"]
        )

        anomalies = []

        if "large_transaction" in enabled_types:
            anomalies.extend(await self._detect_large_transactions(transactions, settings))

        if "category_shift" in enabled_types:
            anomalies.extend(await self._detect_category_anomalies(transactions, settings))

        if "duplicate" in enabled_types:
            anomalies.extend(
                await self._detect_duplicates(
                    transactions, config.duplicate_charge_hours if config else 24
                )
            )

        if "recurring_change" in enabled_types:
            anomalies.extend(
                await self._detect_recurring_changes(
                    transactions, config.recurring_change_percent if config else 20
                )
            )

        # ML-based detection if enough data
        if len(transactions) >= 50 and "ml_detected" in enabled_types:
            ml_anomalies = await self._detect_ml_anomalies(transactions)
            anomalies.extend(ml_anomalies)

        return anomalies

    async def _detect_large_transactions(
        self,
        transactions: list[dict[str, Any]],
        settings: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Detect transactions exceeding threshold or z-score."""
        amounts = [abs(tx.get("amount", 0)) for tx in transactions if tx.get("amount")]
        if not amounts:
            return []

        mean_val = np.mean(amounts)
        std_val = np.std(amounts) if len(amounts) > 1 else 0
        threshold = max(settings["min_amount"], mean_val + settings["z_threshold"] * std_val)

        anomalies = []
        for tx in transactions:
            amount = abs(tx.get("amount", 0))
            if amount >= threshold:
                z_score = (amount - mean_val) / std_val if std_val > 0 else 0
                anomalies.append(
                    {
                        "type": "large_transaction",
                        "severity": min(5, max(1, int(z_score))),
                        "transaction_id": tx.get("id"),
                        "category": tx.get("category"),
                        "description": f"Large transaction: ¥{amount:,} (z-score: {z_score:.1f})",
                        "data": {
                            "amount": amount,
                            "mean": mean_val,
                            "std": std_val,
                            "z_score": z_score,
                            "threshold": threshold,
                        },
                    }
                )

        return anomalies

    async def _detect_category_anomalies(
        self,
        transactions: list[dict[str, Any]],
        settings: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Detect unusual spending patterns in categories."""
        category_monthly = defaultdict(list)
        for tx in transactions:
            date_val = tx.get("date", "")
            if date_val:
                month = date_val[:7]  # YYYY-MM
                category_monthly[tx.get("category", "Other")].append(
                    (month, abs(tx.get("amount", 0)))
                )

        anomalies = []
        z_threshold = settings["z_threshold"]
        for category, monthly_data in category_monthly.items():
            if len(monthly_data) < 3:
                continue

            amounts = [amount for _, amount in monthly_data]
            mean_val = np.mean(amounts)
            std_val = np.std(amounts) if len(amounts) > 1 else 0

            for month, amount in monthly_data:
                if std_val > 0:
                    z_score = (amount - mean_val) / std_val
                    if abs(z_score) >= z_threshold:
                        anomalies.append(
                            {
                                "type": "category_shift",
                                "severity": min(5, max(1, int(abs(z_score)))),
                                "category": category,
                                "description": f"{category} spending: ¥{amount:,} ({'+' if z_score > 0 else ''}{z_score:.1f}σ from average)",
                                "data": {
                                    "category": category,
                                    "amount": amount,
                                    "average": mean_val,
                                    "z_score": z_score,
                                },
                            }
                        )

        return anomalies

    async def _detect_duplicates(
        self,
        transactions: list[dict[str, Any]],
        duplicate_charge_hours: int = 24,
    ) -> list[dict[str, Any]]:
        """Detect potential duplicate transactions."""
        anomalies = []
        tx_dict = defaultdict(list)

        for tx in transactions:
            date_val = tx.get("date", "")
            desc = tx.get("description", "")[:50].lower().strip()
            if date_val and desc:
                key = f"{date_val[:10]}|{desc}"
                tx_dict[key].append(tx)

        for key, txs in tx_dict.items():
            if len(txs) >= 2:
                for i, tx in enumerate(txs[1:], 1):
                    anomalies.append(
                        {
                            "type": "duplicate",
                            "severity": 3,
                            "transaction_id": tx.get("id"),
                            "description": f"Potential duplicate of transaction #{txs[0].get('id')}",
                            "data": {
                                "original_id": txs[0].get("id"),
                                "duplicate_id": tx.get("id"),
                                "amount": tx.get("amount"),
                            },
                        }
                    )

        return anomalies

    async def _detect_recurring_changes(
        self,
        transactions: list[dict[str, Any]],
        change_percent_threshold: int = 20,
    ) -> list[dict[str, Any]]:
        """Detect changes in recurring subscription amounts."""
        merchant_groups = defaultdict(list)
        for tx in transactions:
            desc = tx.get("description", "")
            words = desc.split()[:3]
            merchant_key = " ".join(words).lower().strip()
            if merchant_key:
                merchant_groups[merchant_key].append(tx)

        anomalies = []
        for merchant, txs in merchant_groups.items():
            if len(txs) < 2:
                continue

            sorted_txs = sorted(txs, key=lambda x: x.get("date", ""))
            amounts = [abs(tx.get("amount", 0)) for tx in sorted_txs]

            if len(amounts) >= 2:
                current = amounts[-1]
                previous = amounts[-2] if len(amounts) > 1 else current
                if previous > 0:
                    change_pct = (current - previous) / previous * 100
                    if abs(change_pct) >= change_percent_threshold:
                        anomalies.append(
                            {
                                "type": "recurring_change",
                                "severity": 2 if current > previous else 1,
                                "description": f"Price change detected for {merchant}: ¥{previous:,} → ¥{current:,} ({'+' if change_pct > 0 else ''}{change_pct:.0f}%)",
                                "data": {
                                    "merchant": merchant,
                                    "previous_amount": previous,
                                    "current_amount": current,
                                    "change_percent": change_pct,
                                },
                            }
                        )

        return anomalies

    async def _detect_ml_anomalies(
        self,
        transactions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Use Isolation Forest for multi-dimensional anomaly detection."""
        try:
            from sklearn.ensemble import IsolationForest
        except ImportError:
            return []

        features = self._extract_features(transactions)

        if len(features) < 20:
            return []

        try:
            model = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42,
            )

            model.fit(features)
            predictions = model.predict(features)
            scores = model.decision_function(features)

            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, scores)):
                if pred == -1:
                    tx = transactions[i]
                    severity = min(5, max(1, int((0.5 - score) * 10)))
                    anomalies.append(
                        {
                            "type": "ml_detected",
                            "severity": severity,
                            "transaction_id": tx.get("id"),
                            "description": f"Unusual pattern detected for: {tx.get('description', '')[:50]}",
                            "data": {
                                "isolation_score": float(score),
                                "feature_vector": features[i].tolist()
                                if hasattr(features[i], "tolist")
                                else list(features[i]),
                            },
                        }
                    )

            return anomalies
        except Exception:
            return []

    def _extract_features(self, transactions: list[dict[str, Any]]) -> np.ndarray:
        """Extract numerical features for ML model."""
        amounts = [abs(tx.get("amount", 0)) for tx in transactions]
        if not amounts:
            return np.array([]).reshape(-1, 1)

        amounts_arr = np.array(amounts).reshape(-1, 1)
        return amounts_arr

    def save_anomalies(self, user_id: int, anomalies: list[dict[str, Any]]) -> list[AnomalyAlert]:
        """Save detected anomalies to database."""
        saved_alerts = []

        for anomaly in anomalies:
            alert = AnomalyAlert(
                user_id=user_id,
                type=anomaly.get("type", "unknown"),
                severity=anomaly.get("severity", 3),
                transaction_id=anomaly.get("transaction_id"),
                category=anomaly.get("category"),
                description=anomaly.get("description", ""),
                data=anomaly.get("data"),
                expires_at=datetime.utcnow() + timedelta(days=7),
            )
            self.db.add(alert)
            saved_alerts.append(alert)

        self.db.commit()
        return saved_alerts

    def get_user_alerts(
        self,
        user_id: int,
        limit: int = 20,
        unread_only: bool = False,
        severity: list[int] | None = None,
        types: list[str] | None = None,
    ) -> list[AnomalyAlert]:
        """Get anomaly alerts for a user."""
        query = self.db.query(AnomalyAlert).filter(AnomalyAlert.user_id == user_id)

        if unread_only:
            query = query.filter(AnomalyAlert.is_read == False)

        if severity:
            query = query.filter(AnomalyAlert.severity.in_(severity))

        if types:
            query = query.filter(AnomalyAlert.type.in_(types))

        return query.order_by(AnomalyAlert.created_at.desc()).limit(limit).all()

    def mark_alert_read(self, alert_id: int, user_id: int) -> bool:
        """Mark an anomaly alert as read."""
        alert = (
            self.db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.id == alert_id,
                AnomalyAlert.user_id == user_id,
            )
            .first()
        )

        if alert:
            alert.is_read = True
            self.db.commit()
            return True
        return False

    def dismiss_alert(self, alert_id: int, user_id: int) -> bool:
        """Dismiss an anomaly alert."""
        alert = (
            self.db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.id == alert_id,
                AnomalyAlert.user_id == user_id,
            )
            .first()
        )

        if alert:
            alert.is_dismissed = True
            alert.is_read = True
            alert.dismissed_at = datetime.utcnow()
            self.db.commit()
            return True
        return False

    def delete_alert(self, alert_id: int, user_id: int) -> bool:
        """Delete an anomaly alert."""
        alert = (
            self.db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.id == alert_id,
                AnomalyAlert.user_id == user_id,
            )
            .first()
        )

        if alert:
            self.db.delete(alert)
            self.db.commit()
            return True
        return False
