"""DeFi Position Insights Service using Claude AI.

Generates educational insights about LP position performance,
impermanent loss, and portfolio allocation recommendations.
"""
import json
from decimal import Decimal
from typing import Any, Optional

from anthropic import Anthropic
from sqlalchemy.orm import Session

from ..config import settings
from ..schemas.crypto_wallet import DefiPositionSnapshotResponse


class DefiInsightsService:
    """Service for AI-powered DeFi position insights."""

    def __init__(self):
        """Initialize Claude AI client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"

    def generate_position_insights(
        self,
        position_data: dict,
        performance_metrics: dict,
        apy_data: Optional[dict] = None,
        language: str = "en"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Generate AI insights for a DeFi position.

        Args:
            position_data: Position info (protocol, symbol, chain, etc.)
            performance_metrics: Calculated metrics (returns, IL, etc.)
            apy_data: Optional current APY data from DeFiLlama
            language: Language code (ja, en, vi)

        Returns:
            Tuple of (insights dict, usage dict with tokens)
        """
        prompt = self._build_position_insights_prompt(
            position_data=position_data,
            performance_metrics=performance_metrics,
            apy_data=apy_data,
            language=language
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        insights = self._parse_insights_response(response.content[0].text)
        return insights, usage

    def _build_position_insights_prompt(
        self,
        position_data: dict,
        performance_metrics: dict,
        apy_data: Optional[dict],
        language: str
    ) -> str:
        """Build prompt for position insights generation."""
        lang_name = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}.get(language, "English")

        # Format position info
        protocol = position_data.get("protocol", "Unknown")
        symbol = position_data.get("symbol", "Unknown")
        chain = position_data.get("chain_id", "Unknown")
        position_type = position_data.get("position_type", "deposit")

        # Format performance metrics
        days_held = performance_metrics.get("days_held", 0)
        start_value = performance_metrics.get("start_value_usd", 0)
        current_value = performance_metrics.get("current_value_usd", 0)
        total_return_pct = performance_metrics.get("total_return_pct", 0)
        annualized_return = performance_metrics.get("annualized_return_pct", 0)

        # IL metrics (may be None)
        il_pct = performance_metrics.get("il_percentage")
        il_usd = performance_metrics.get("il_usd")
        hodl_value = performance_metrics.get("hodl_value_usd")
        lp_outperformed = performance_metrics.get("lp_outperformed_hodl")

        # Yield estimates
        estimated_yield_pct = performance_metrics.get("estimated_yield_pct")

        # APY info
        current_apy = apy_data.get("apy") if apy_data else None
        apy_30d = apy_data.get("apyMean30d") if apy_data else None

        # Build context sections
        il_section = ""
        if il_pct is not None:
            il_section = f"""
IMPERMANENT LOSS ANALYSIS:
- IL Percentage: {il_pct:.2f}%
- IL in USD: ${il_usd:.2f}
- HODL Value (if held tokens): ${hodl_value:.2f}
- LP vs HODL: {"LP outperformed" if lp_outperformed else "HODL outperformed"}"""

        yield_section = ""
        if estimated_yield_pct is not None:
            yield_section = f"""
YIELD EARNED:
- Estimated Yield: {estimated_yield_pct:.2f}%"""

        apy_section = ""
        if current_apy is not None:
            apy_section = f"""
PROTOCOL APY:
- Current APY: {current_apy:.2f}%
- 30-day Average: {apy_30d:.2f}%""" if apy_30d else f"""
PROTOCOL APY:
- Current APY: {current_apy:.2f}%"""

        prompt = f"""You are a DeFi analyst providing educational insights. Analyze this LP position and provide helpful observations.

POSITION DETAILS:
- Protocol: {protocol}
- Pair/Symbol: {symbol}
- Chain: {chain}
- Type: {position_type}
- Days Held: {days_held}

PERFORMANCE METRICS:
- Starting Value: ${start_value:.2f}
- Current Value: ${current_value:.2f}
- Total Return: {total_return_pct:.2f}%
- Annualized Return: {annualized_return:.2f}%
{il_section}
{yield_section}
{apy_section}

TASK: Generate educational insights about this position. Include:
1. A summary of performance (2-3 sentences)
2. Analysis of IL impact if data available
3. One practical observation or consideration
4. A simple scenario projection (what if price moves +20% or -20%)

REQUIRED OUTPUT FORMAT (JSON):
{{
  "summary": "Performance summary in 2-3 sentences",
  "il_analysis": "IL analysis or null if no data",
  "observation": "One practical insight",
  "scenario_up": "What happens if underlying price +20%",
  "scenario_down": "What happens if underlying price -20%",
  "risk_level": "low|medium|high",
  "recommendation": "Brief suggestion (not financial advice)"
}}

RULES:
- Be educational, not prescriptive (avoid "you should")
- Use plain language, avoid jargon
- Include disclaimer that this is not financial advice
- All text fields in {lang_name}
- Keep each field under 100 words
- For scenarios, use approximate IL formula: 2x price = ~5.7% IL

Generate insights now:"""

        return prompt

    def _parse_insights_response(self, response_text: str) -> dict[str, Any]:
        """Parse Claude's insights response."""
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON found in Claude response")

        json_str = response_text[start_idx:end_idx]
        insights = json.loads(json_str)

        # Ensure required fields exist
        required_fields = ["summary", "observation", "risk_level"]
        for field in required_fields:
            if field not in insights:
                insights[field] = None

        return insights

    def generate_portfolio_insights(
        self,
        positions: list[dict],
        total_value_usd: float,
        language: str = "en"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Generate AI insights for entire DeFi portfolio.

        Args:
            positions: List of position dicts with performance data
            total_value_usd: Total portfolio value
            language: Language code

        Returns:
            Tuple of (insights dict, usage dict)
        """
        prompt = self._build_portfolio_insights_prompt(
            positions=positions,
            total_value_usd=total_value_usd,
            language=language
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        insights = self._parse_portfolio_response(response.content[0].text)
        return insights, usage

    def _build_portfolio_insights_prompt(
        self,
        positions: list[dict],
        total_value_usd: float,
        language: str
    ) -> str:
        """Build prompt for portfolio-level insights."""
        lang_name = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}.get(language, "English")

        # Format positions summary
        positions_str = ""
        by_protocol = {}
        by_chain = {}

        for pos in positions:
            protocol = pos.get("protocol", "Unknown")
            chain = pos.get("chain_id", "Unknown")
            value = pos.get("balance_usd", 0)

            by_protocol[protocol] = by_protocol.get(protocol, 0) + float(value)
            by_chain[chain] = by_chain.get(chain, 0) + float(value)

            positions_str += f"- {protocol} {pos.get('symbol', '?')}: ${float(value):.2f}\n"

        # Format allocations
        protocol_alloc = "\n".join([
            f"- {p}: ${v:.2f} ({v/total_value_usd*100:.1f}%)"
            for p, v in sorted(by_protocol.items(), key=lambda x: -x[1])
        ])

        chain_alloc = "\n".join([
            f"- {c}: ${v:.2f} ({v/total_value_usd*100:.1f}%)"
            for c, v in sorted(by_chain.items(), key=lambda x: -x[1])
        ])

        prompt = f"""You are a DeFi portfolio analyst. Analyze this portfolio and provide insights.

PORTFOLIO OVERVIEW:
- Total Value: ${total_value_usd:.2f}
- Number of Positions: {len(positions)}

POSITIONS:
{positions_str}

BY PROTOCOL:
{protocol_alloc}

BY CHAIN:
{chain_alloc}

TASK: Provide portfolio-level insights including:
1. Diversification assessment
2. Risk concentration observations
3. Suggestions for consideration (educational only)

REQUIRED OUTPUT FORMAT (JSON):
{{
  "diversification_score": "well-diversified|moderate|concentrated",
  "diversification_analysis": "Brief analysis of allocation",
  "risk_observations": ["observation 1", "observation 2"],
  "considerations": ["consideration 1", "consideration 2"],
  "overall_assessment": "Brief overall portfolio assessment"
}}

RULES:
- Educational, not financial advice
- All text in {lang_name}
- Keep observations practical and actionable
- Max 3 items per array field

Generate portfolio insights:"""

        return prompt

    def _parse_portfolio_response(self, response_text: str) -> dict[str, Any]:
        """Parse portfolio insights response."""
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON in response")

        return json.loads(response_text[start_idx:end_idx])
