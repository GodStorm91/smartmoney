"""Email service using SendGrid."""
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SendGrid."""

    def __init__(self):
        """Initialize SendGrid client."""
        self.client = SendGridAPIClient(settings.sendgrid_api_key) if settings.sendgrid_api_key else None

    def send_budget_alert(
        self,
        to_email: str,
        category: str,
        budgeted: int,
        spent: int,
        percentage: float,
        alert_type: str  # '80_percent' or '100_percent'
    ) -> bool:
        """Send budget alert email.

        Args:
            to_email: Recipient email address
            category: Budget category name
            budgeted: Budgeted amount (in cents)
            spent: Spent amount (in cents)
            percentage: Percentage of budget spent
            alert_type: Type of alert ('80_percent' or '100_percent')

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.client:
            logger.warning("SendGrid API key not configured, skipping email")
            return False

        try:
            # Format amounts for display
            budgeted_display = f"¥{budgeted:,}"
            spent_display = f"¥{spent:,}"

            # Determine subject and message based on alert type
            if alert_type == '80_percent':
                subject = f"⚠️ Budget Alert: {category} at 80%"
                message = f"""
You've spent {percentage:.1f}% of your budget for {category}.

Budgeted: {budgeted_display}
Spent: {spent_display}
Remaining: ¥{budgeted - spent:,}

Consider adjusting your spending to stay within budget.
"""
            else:  # 100_percent
                subject = f"🚨 Budget Exceeded: {category} at {percentage:.0f}%"
                message = f"""
You've exceeded your budget for {category}!

Budgeted: {budgeted_display}
Spent: {spent_display}
Over budget by: ¥{spent - budgeted:,}

Please review your spending in this category.
"""

            # Create email
            email_message = Mail(
                from_email='noreply@smartmoney.app',
                to_emails=to_email,
                subject=subject,
                plain_text_content=message
            )

            # Send email
            response = self.client.send(email_message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Budget alert email sent to {to_email} for {category}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending budget alert email: {e}")
            return False

    def send_monthly_budget_summary(
        self,
        to_email: str,
        month: str,
        total_budgeted: int,
        total_spent: int,
        categories_summary: list[dict]
    ) -> bool:
        """Send monthly budget summary email.

        Args:
            to_email: Recipient email address
            month: Month string (YYYY-MM)
            total_budgeted: Total budgeted amount
            total_spent: Total spent amount
            categories_summary: List of category summaries

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.client:
            logger.warning("SendGrid API key not configured, skipping email")
            return False

        try:
            # Build categories summary text
            categories_text = "\n".join([
                f"  {cat['category']}: ¥{cat['spent']:,} / ¥{cat['budgeted']:,} ({cat['percentage']:.0f}%)"
                for cat in categories_summary
            ])

            message = f"""
Monthly Budget Summary for {month}

Total Budget: ¥{total_budgeted:,}
Total Spent: ¥{total_spent:,}
Overall: {(total_spent / total_budgeted * 100):.0f}%

Category Breakdown:
{categories_text}

Keep up the good work managing your finances!
"""

            email_message = Mail(
                from_email='noreply@smartmoney.app',
                to_emails=to_email,
                subject=f"📊 Budget Summary for {month}",
                plain_text_content=message
            )

            response = self.client.send(email_message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Monthly summary email sent to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending monthly summary email: {e}")
            return False
