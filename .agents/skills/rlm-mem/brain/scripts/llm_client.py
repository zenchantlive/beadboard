"""
LLM Query Wrapper (D2.1)

Provides a standardized interface for LLM calls with retry logic and cost tracking.
"""

from dataclasses import dataclass
import os
import time
from typing import Any, Dict, List, Optional


@dataclass
class LLMResponse:
    """Response object with usage metadata."""
    text: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    latency_ms: int
    provider: str
    model: str


class LLMError(RuntimeError):
    """Base error for LLM failures."""
    def __init__(self, message: str, provider: str, retries: int, is_transient: bool = False):
        super().__init__(message)
        self.provider = provider
        self.retries = retries
        self.is_transient = is_transient


class LLMTransientError(LLMError):
    """Retryable LLM error."""
    def __init__(self, message: str, provider: str = "unknown", retries: int = 0):
        super().__init__(message, provider=provider, retries=retries, is_transient=True)


class LLMPermanentError(LLMError):
    """Non-retryable LLM error."""
    def __init__(self, message: str, provider: str = "unknown", retries: int = 0):
        super().__init__(message, provider=provider, retries=retries, is_transient=False)


class LLMBudgetExceededError(LLMError):
    """Raised when LLM budget is exceeded."""
    def __init__(self, message: str, provider: str = "unknown", retries: int = 0):
        super().__init__(message, provider=provider, retries=retries, is_transient=False)


class LLMClient:
    """Standardized LLM client with retry and usage tracking."""
    _DEFAULT_MODELS = {
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-5-sonnet-20240620",
        "local": "local",
        "mock": "mock"
    }
    _ENV_KEYS = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY"
    }
    _DEFAULT_RATES = {
        "openai": {"input": 5.0, "output": 15.0},
        "anthropic": {"input": 3.0, "output": 15.0},
        "local": {"input": 0.0, "output": 0.0},
        "mock": {"input": 0.0, "output": 0.0}
    }

    def __init__(
        self,
        provider: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_retries: int = 3,
        backoff_base: float = 1.0,
        sleep_fn=time.sleep,
        mock_sequence: Optional[List[Any]] = None,
        rate_table: Optional[Dict[str, Dict[str, float]]] = None,
        max_cost_usd: Optional[float] = None
    ):
        self.provider = provider.lower()
        if self.provider not in self._DEFAULT_MODELS:
            raise ValueError(f"Unsupported provider: {provider}")

        self.api_key = api_key or self._load_api_key()
        if self.provider in self._ENV_KEYS and not self.api_key:
            raise ValueError(f"API key required for provider '{self.provider}'")

        self.model = model or self._DEFAULT_MODELS[self.provider]
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.sleep_fn = sleep_fn
        self._mock_sequence = list(mock_sequence) if mock_sequence is not None else []
        self._rate_table = rate_table or self._DEFAULT_RATES
        self._max_cost_usd = max_cost_usd
        self._usage = {
            "calls": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0
        }

    def _load_api_key(self) -> Optional[str]:
        env_key = self._ENV_KEYS.get(self.provider)
        if env_key:
            return os.getenv(env_key)
        return None

    def _count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return max(1, len(text) // 4)

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        rates = self._rate_table.get(self.provider, {"input": 0.0, "output": 0.0})
        input_cost = (input_tokens / 1000.0) * rates.get("input", 0.0)
        output_cost = (output_tokens / 1000.0) * rates.get("output", 0.0)
        return input_cost + output_cost

    def _is_transient_error(self, error: Exception) -> bool:
        if isinstance(error, LLMTransientError):
            return True
        message = str(error).lower()
        return any(keyword in message for keyword in ("rate limit", "timeout", "temporarily"))

    def _ensure_budget(self, allow_equal: bool = False) -> None:
        if self._max_cost_usd is None:
            return
        total_cost = self._usage["total_cost_usd"]
        if allow_equal:
            over_budget = total_cost > self._max_cost_usd
        else:
            over_budget = total_cost >= self._max_cost_usd
        if over_budget:
            raise LLMBudgetExceededError(
                f"Cost budget exceeded: total_cost={total_cost:.6f} budget={self._max_cost_usd:.6f}",
                provider=self.provider
            )

    def _mock_complete(self, prompt: str) -> str:
        if self._mock_sequence:
            next_item = self._mock_sequence.pop(0)
            if isinstance(next_item, Exception):
                raise next_item
            return str(next_item)
        return prompt

    def _complete_provider(self, prompt: str, **kwargs) -> str:
        if self.provider == "mock":
            return self._mock_complete(prompt)
        if self.provider == "local":
            return prompt
        raise LLMPermanentError(f"Provider '{self.provider}' not implemented", provider=self.provider)

    def complete(self, prompt: str, **kwargs) -> LLMResponse:
        retries = 0
        start = time.perf_counter()

        while True:
            try:
                self._ensure_budget()
                text = self._complete_provider(prompt, **kwargs)
                input_tokens = self._count_tokens(prompt)
                output_tokens = self._count_tokens(text)
                total_tokens = input_tokens + output_tokens
                cost_usd = self._calculate_cost(input_tokens, output_tokens)
                latency_ms = max(1, int((time.perf_counter() - start) * 1000))

                response = LLMResponse(
                    text=text,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    cost_usd=cost_usd,
                    latency_ms=latency_ms,
                    provider=self.provider,
                    model=self.model
                )
                self._record_usage(response)
                self._ensure_budget(allow_equal=True)
                return response
            except Exception as exc:
                if isinstance(exc, LLMBudgetExceededError):
                    raise
                if not self._is_transient_error(exc):
                    raise LLMError(
                        str(exc),
                        provider=self.provider,
                        retries=0,
                        is_transient=False
                    ) from exc

                if retries >= self.max_retries:
                    raise LLMError(
                        str(exc),
                        provider=self.provider,
                        retries=retries,
                        is_transient=True
                    ) from exc

                sleep_seconds = self.backoff_base * (2 ** retries)
                self.sleep_fn(sleep_seconds)
                retries += 1

    def _record_usage(self, response: LLMResponse) -> None:
        self._usage["calls"] += 1
        self._usage["input_tokens"] += response.input_tokens
        self._usage["output_tokens"] += response.output_tokens
        self._usage["total_tokens"] += response.total_tokens
        self._usage["total_cost_usd"] += response.cost_usd

    def get_cost(self) -> float:
        return float(self._usage["total_cost_usd"])

    def get_usage_stats(self) -> Dict[str, Any]:
        return dict(self._usage)

    def get_budget_status(self) -> Dict[str, Any]:
        total = float(self._usage["total_cost_usd"])
        budget = self._max_cost_usd
        remaining = None if budget is None else max(0.0, budget - total)
        return {
            "total_cost_usd": total,
            "budget_usd": budget,
            "remaining_usd": remaining,
            "over_budget": budget is not None and total > budget
        }
