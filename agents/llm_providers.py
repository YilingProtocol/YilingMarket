"""
Yiling Protocol — Multi-LLM Provider Support

Factory for creating LLM clients. Supports OpenAI, Anthropic, and Google Gemini.
Each agent can use a different LLM provider for genuine diversity.
"""

import json
import os


class LLMProvider:
    """Base interface for LLM providers."""

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        """Send a chat request and return the raw response content string."""
        raise NotImplementedError


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider (gpt-4o-mini, gpt-4o, etc.)."""

    def __init__(self, model: str = "gpt-4o-mini", api_key: str = None):
        from openai import OpenAI
        self.model = model
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.provider_name = f"openai/{model}"

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        return response.choices[0].message.content


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider (claude-sonnet, claude-haiku, etc.)."""

    def __init__(self, model: str = "claude-sonnet-4-5-20250929", api_key: str = None):
        import anthropic
        self.model = model
        self.client = anthropic.Anthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))
        self.provider_name = f"anthropic/{model}"

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt + "\n\nRespond ONLY with valid JSON."},
            ],
            temperature=0.7,
        )
        return response.content[0].text


class GeminiProvider(LLMProvider):
    """Google Gemini provider (gemini-2.0-flash, etc.)."""

    def __init__(self, model: str = "gemini-2.0-flash", api_key: str = None):
        from google import genai
        self.model = model
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.client = genai.Client(api_key=self.api_key)
        self.provider_name = f"gemini/{model}"

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.models.generate_content(
            model=self.model,
            contents=f"{system_prompt}\n\n{user_prompt}\n\nRespond ONLY with valid JSON.",
            config={
                "temperature": 0.7,
                "response_mime_type": "application/json",
            },
        )
        return response.text


# ─── Factory ────────────────────────────────────────────────────────────────

PROVIDERS = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
}


def create_llm_provider(provider: str, model: str = None, api_key: str = None) -> LLMProvider:
    """Create an LLM provider instance.

    Args:
        provider: "openai", "anthropic", or "gemini"
        model: Model name (uses default if None)
        api_key: API key (uses env var if None)

    Returns:
        LLMProvider instance
    """
    provider = provider.lower()
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'. Available: {list(PROVIDERS.keys())}")

    kwargs = {}
    if model:
        kwargs["model"] = model
    if api_key:
        kwargs["api_key"] = api_key

    return PROVIDERS[provider](**kwargs)
