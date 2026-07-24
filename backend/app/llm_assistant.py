"""Adapted copy of src/llm_assistant.py, with Streamlit's cache_resource/cache_data/
secrets swapped for a plain singleton + TTL cache so this module has no Streamlit
dependency. Prompts and Claude calls are otherwise identical.
"""
import functools
import os

import anthropic

from .core.cache import ttl_cache

MODEL = "claude-opus-4-8"

SYSTEM_PROMPT = (
    "You are the AI analyst embedded in Longon Capital, a Nigerian Exchange (NGX) "
    "analytics platform. Ground every statement strictly in the data given to you in "
    "the prompt — never invent tickers, prices, or figures that weren't provided. "
    "Write in plain, direct prose (no headers, no bullet lists) and keep responses "
    "tight: 3-6 sentences unless the user explicitly asks for more detail. You are not "
    "a licensed financial advisor — never instruct the user to buy or sell a specific "
    "security, and treat every analysis as commentary on the data, not investment advice. "
    "Prices are delayed 20 minutes."
)


@functools.lru_cache(maxsize=1)
def _get_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


def is_available() -> bool:
    return _get_client() is not None


def _extract_text(content_blocks) -> str:
    return "".join(block.text for block in content_blocks if block.type == "text")


@ttl_cache(900)
def get_market_commentary(market_summary: str) -> str:
    """Short narrative on overall NGX market breadth and standout movers."""
    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        messages=[{
            "role": "user",
            "content": (
                f"Today's NGX market snapshot:\n\n{market_summary}\n\n"
                "Write a short market commentary (3-5 sentences) on overall breadth "
                "and the most notable individual moves."
            ),
        }],
    )
    return _extract_text(response.content)


@ttl_cache(300)
def get_portfolio_analysis(portfolio_summary: str) -> str:
    """Short narrative on portfolio composition, performance, and risk profile."""
    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        messages=[{
            "role": "user",
            "content": (
                f"Here is the user's NGX portfolio snapshot:\n\n{portfolio_summary}\n\n"
                "Write a short analysis (4-6 sentences) covering concentration/diversification, "
                "performance versus the ASI benchmark, and what the Monte Carlo projection "
                "implies about the risk/reward profile."
            ),
        }],
    )
    return _extract_text(response.content)


def stream_chat_reply(chat_history: list[dict], context_summary: str):
    """Yields text chunks for a streamed chat response grounded in the app's current data."""
    client = _get_client()
    system = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Data currently visible to the user in the app:\n{context_summary}"
    )
    with client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=chat_history,
    ) as stream:
        yield from stream.text_stream
