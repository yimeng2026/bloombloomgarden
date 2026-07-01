#!/usr/bin/env python3
"""
10 LLM Provider Request Format Validation Tests
Pure validation - no actual API calls, just request body construction
"""

import json
import unittest
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class LLMRequest:
    provider: str
    model: str
    messages: List[Dict[str, str]]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: bool = False
    top_p: Optional[float] = None
    tools: Optional[List[Dict]] = None
    extra_headers: Optional[Dict[str, str]] = None
    extra_body: Optional[Dict] = None


def build_openai_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    if req.top_p is not None:
        body["top_p"] = req.top_p
    if req.tools:
        body["tools"] = req.tools
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_azure_request(req: LLMRequest, api_version: str = "2024-02-01") -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    headers = {
        "Content-Type": "application/json",
        "api-key": "sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_anthropic_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    system_msg = ""
    user_messages = []
    for m in req.messages:
        if m.get("role") == "system":
            system_msg = m.get("content", "")
        else:
            user_messages.append(m)
    body: Dict[str, Any] = {
        "model": req.model,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 4096,
        "messages": user_messages if user_messages else req.messages,
        "stream": req.stream,
    }
    if system_msg:
        body["system"] = system_msg
    if req.temperature is not None:
        body["temperature"] = req.temperature
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "sk-test",
        "anthropic-version": "2023-06-01",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_deepseek_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    if req.top_p is not None:
        body["top_p"] = req.top_p
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_moonshot_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_kimi_code_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.3,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 4000,
        "stream": req.stream,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
        "User-Agent": "claude-code/0.7.8",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_qwen_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 1500,
        "stream": req.stream,
        "enable_search": False,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_gemini_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    contents = []
    system_instruction = None
    for m in req.messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            system_instruction = {"parts": [{"text": content}]}
        else:
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": content}]})
    body: Dict[str, Any] = {
        "contents": contents if contents else [{"role": "user", "parts": [{"text": "Hello"}]}],
        "generationConfig": {
            "temperature": req.temperature if req.temperature is not None else 0.7,
            "maxOutputTokens": req.max_tokens if req.max_tokens is not None else 2048,
        },
    }
    if system_instruction:
        body["systemInstruction"] = system_instruction
    headers = {
        "Content-Type": "application/json",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_glm_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    if req.top_p is not None:
        body["top_p"] = req.top_p
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


def build_openrouter_request(req: LLMRequest) -> tuple[Dict[str, Any], Dict[str, str]]:
    body = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature if req.temperature is not None else 0.7,
        "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
        "stream": req.stream,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-test",
        "HTTP-Referer": "https://thousand-realms.garden",
        "X-Title": "千界花园",
    }
    body.update(req.extra_body or {})
    headers.update(req.extra_headers or {})
    return body, headers


BUILDERS = {
    "openai": build_openai_request,
    "azure": build_azure_request,
    "anthropic": build_anthropic_request,
    "deepseek": build_deepseek_request,
    "moonshot": build_moonshot_request,
    "kimi-code": build_kimi_code_request,
    "qwen": build_qwen_request,
    "gemini": build_gemini_request,
    "glm": build_glm_request,
    "openrouter": build_openrouter_request,
}


class TestProviderFormats(unittest.TestCase):
    """Test 10 LLM Provider request body & header construction"""

    def _assert_json_serializable(self, obj: Any, msg: str = ""):
        try:
            json.dumps(obj)
        except (TypeError, ValueError) as e:
            self.fail(f"JSON serialization failed: {msg} -> {e}")

    def _make_request(self, provider: str, **kwargs) -> tuple[Dict, Dict]:
        req = LLMRequest(
            provider=provider,
            model=kwargs.get("model", "default-model"),
            messages=kwargs.get("messages", [{"role": "user", "content": "Hi"}]),
            temperature=kwargs.get("temperature"),
            max_tokens=kwargs.get("max_tokens"),
            stream=kwargs.get("stream", False),
            top_p=kwargs.get("top_p"),
            tools=kwargs.get("tools"),
            extra_headers=kwargs.get("extra_headers"),
            extra_body=kwargs.get("extra_body"),
        )
        builder = BUILDERS[provider]
        return builder(req)

    # ====== OpenAI ======
    def test_openai_basic(self):
        body, headers = self._make_request("openai", model="gpt-4o")
        self.assertEqual(body["model"], "gpt-4o")
        self.assertIn("messages", body)
        self.assertEqual(body["temperature"], 0.7)
        self.assertEqual(body["max_tokens"], 2048)
        self.assertFalse(body["stream"])
        self.assertEqual(headers["Content-Type"], "application/json")
        self._assert_json_serializable(body)

    def test_openai_with_tools(self):
        tools = [{
            "type": "function",
            "function": {"name": "get_weather", "parameters": {"type": "object", "properties": {}}}
        }]
        body, _ = self._make_request("openai", model="gpt-4o", tools=tools, stream=True)
        self.assertIn("tools", body)
        self.assertTrue(body["stream"])
        self._assert_json_serializable(body)

    def test_openai_custom_params(self):
        body, _ = self._make_request("openai", model="gpt-3.5-turbo", temperature=0.2, max_tokens=512, top_p=0.9)
        self.assertEqual(body["temperature"], 0.2)
        self.assertEqual(body["max_tokens"], 512)
        self.assertEqual(body["top_p"], 0.9)

    # ====== Azure ======
    def test_azure_basic(self):
        body, headers = self._make_request("azure", model="gpt-4")
        self.assertEqual(body["model"], "gpt-4")
        self.assertEqual(headers["api-key"], "sk-test")
        self.assertNotIn("Authorization", headers)
        self._assert_json_serializable(body)

    def test_azure_streaming(self):
        body, _ = self._make_request("azure", model="gpt-4", stream=True, max_tokens=4096)
        self.assertTrue(body["stream"])
        self.assertEqual(body["max_tokens"], 4096)

    # ====== Anthropic ======
    def test_anthropic_basic(self):
        body, headers = self._make_request("anthropic", model="claude-3-5-sonnet-20241022",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"},
            ])
        self.assertEqual(body["model"], "claude-3-5-sonnet-20241022")
        self.assertIn("messages", body)
        self.assertIn("system", body)
        self.assertEqual(body["system"], "You are a helpful assistant.")
        self.assertEqual(headers["x-api-key"], "sk-test")
        self.assertEqual(headers["anthropic-version"], "2023-06-01")
        self._assert_json_serializable(body)

    def test_anthropic_no_system(self):
        body, _ = self._make_request("anthropic", model="claude-3-haiku",
            messages=[{"role": "user", "content": "Hi"}])
        self.assertNotIn("system", body)

    # ====== DeepSeek ======
    def test_deepseek_basic(self):
        body, headers = self._make_request("deepseek", model="deepseek-chat")
        self.assertEqual(body["model"], "deepseek-chat")
        self.assertEqual(headers["Authorization"], "Bearer sk-test")
        self._assert_json_serializable(body)

    def test_deepseek_reasoner(self):
        body, _ = self._make_request("deepseek", model="deepseek-reasoner", max_tokens=8192)
        self.assertEqual(body["model"], "deepseek-reasoner")
        self.assertEqual(body["max_tokens"], 8192)

    # ====== Moonshot ======
    def test_moonshot_basic(self):
        body, headers = self._make_request("moonshot", model="moonshot-v1-8k")
        self.assertEqual(body["model"], "moonshot-v1-8k")
        self.assertEqual(headers["Authorization"], "Bearer sk-test")
        self._assert_json_serializable(body)

    def test_moonshot_128k(self):
        body, _ = self._make_request("moonshot", model="moonshot-v1-128k", stream=True)
        self.assertEqual(body["model"], "moonshot-v1-128k")
        self.assertTrue(body["stream"])

    # ====== Kimi Code ======
    def test_kimi_code_basic(self):
        body, headers = self._make_request("kimi-code", model="kimi-coder")
        self.assertEqual(body["model"], "kimi-coder")
        self.assertEqual(body["temperature"], 0.3)
        self.assertEqual(body["max_tokens"], 4000)
        self._assert_json_serializable(body)

    def test_kimi_code_user_agent(self):
        """CRITICAL: Kimi Code MUST have User-Agent: claude-code/0.7.8"""
        _, headers = self._make_request("kimi-code", model="kimi-coder")
        self.assertEqual(headers.get("User-Agent"), "claude-code/0.7.8",
            "Kimi Code API requires User-Agent header to be exactly 'claude-code/0.7.8'")

    def test_kimi_code_streaming(self):
        body, headers = self._make_request("kimi-code", model="kimi-coder", stream=True)
        self.assertTrue(body["stream"])
        self.assertEqual(headers.get("User-Agent"), "claude-code/0.7.8")

    # ====== Qwen ======
    def test_qwen_basic(self):
        body, headers = self._make_request("qwen", model="qwen-turbo")
        self.assertEqual(body["model"], "qwen-turbo")
        self.assertEqual(body["max_tokens"], 1500)
        self.assertEqual(body["enable_search"], False)
        self._assert_json_serializable(body)

    def test_qwen_search_enabled(self):
        body, _ = self._make_request("qwen", model="qwen-max",
            extra_body={"enable_search": True})
        self.assertEqual(body["enable_search"], True)

    # ====== Gemini ======
    def test_gemini_basic(self):
        body, headers = self._make_request("gemini", model="gemini-1.5-pro",
            messages=[{"role": "user", "content": "Explain quantum physics"}])
        self.assertIn("contents", body)
        self.assertIn("generationConfig", body)
        self.assertEqual(body["contents"][0]["role"], "user")
        self._assert_json_serializable(body)

    def test_gemini_with_system(self):
        body, _ = self._make_request("gemini", model="gemini-1.5-flash",
            messages=[
                {"role": "system", "content": "You are a scientist."},
                {"role": "user", "content": "What is gravity?"},
            ])
        self.assertIn("systemInstruction", body)
        self.assertEqual(body["systemInstruction"]["parts"][0]["text"], "You are a scientist.")

    def test_gemini_role_mapping(self):
        """Gemini uses 'model' instead of 'assistant'"""
        body, _ = self._make_request("gemini", model="gemini-1.5-pro",
            messages=[
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello!"},
            ])
        roles = [c["role"] for c in body["contents"]]
        self.assertIn("model", roles, "Gemini should map assistant -> model")
        self.assertNotIn("assistant", roles)

    # ====== GLM ======
    def test_glm_basic(self):
        body, headers = self._make_request("glm", model="glm-4")
        self.assertEqual(body["model"], "glm-4")
        self.assertEqual(headers["Authorization"], "Bearer sk-test")
        self._assert_json_serializable(body)

    def test_glm_top_p(self):
        body, _ = self._make_request("glm", model="glm-4", top_p=0.95)
        self.assertEqual(body["top_p"], 0.95)

    # ====== OpenRouter ======
    def test_openrouter_basic(self):
        body, headers = self._make_request("openrouter", model="anthropic/claude-3.5-sonnet")
        self.assertEqual(body["model"], "anthropic/claude-3.5-sonnet")
        self.assertEqual(headers["HTTP-Referer"], "https://thousand-realms.garden")
        self.assertEqual(headers["X-Title"], "千界花园")
        self._assert_json_serializable(body)

    def test_openrouter_free_model(self):
        body, _ = self._make_request("openrouter", model="google/gemini-2.5-pro-exp-03-25:free")
        self.assertEqual(body["model"], "google/gemini-2.5-pro-exp-03-25:free")

    # ====== Cross-cutting tests ======
    def test_all_providers_json_serializable(self):
        for name, builder in BUILDERS.items():
            req = LLMRequest(
                provider=name,
                model="test-model",
                messages=[{"role": "user", "content": "Test"}],
                temperature=0.5,
                max_tokens=1000,
                stream=True,
            )
            body, headers = builder(req)
            self._assert_json_serializable(body, f"Provider {name} body")
            self._assert_json_serializable(headers, f"Provider {name} headers")

    def test_all_providers_have_required_fields(self):
        required = ["model", "messages"]
        for name, builder in BUILDERS.items():
            req = LLMRequest(
                provider=name,
                model="test-model",
                messages=[{"role": "user", "content": "Test"}],
            )
            body, _ = builder(req)
            for field in required:
                self.assertIn(field, body, f"Provider {name} missing required field: {field}")

    def test_anthropic_vs_openai_messages_field(self):
        """Anthropic puts system in separate field, not in messages"""
        openai_body, _ = build_openai_request(LLMRequest(
            provider="openai", model="gpt-4",
            messages=[{"role": "system", "content": "Sys"}, {"role": "user", "content": "Hi"}],
        ))
        anthropic_body, _ = build_anthropic_request(LLMRequest(
            provider="anthropic", model="claude-3",
            messages=[{"role": "system", "content": "Sys"}, {"role": "user", "content": "Hi"}],
        ))
        self.assertIn("system", openai_body["messages"][0]["role"])
        self.assertNotIn("system", [m.get("role") for m in anthropic_body.get("messages", [])])
        self.assertEqual(anthropic_body.get("system"), "Sys")


class TestProviderEdgeCases(unittest.TestCase):
    """Edge cases and boundary tests"""

    def test_empty_messages_fallback(self):
        """Gemini handles empty messages gracefully"""
        req = LLMRequest(provider="gemini", model="gemini-pro", messages=[])
        body, _ = build_gemini_request(req)
        self.assertTrue(len(body["contents"]) > 0, "Gemini should provide fallback content")

    def test_extra_headers_override(self):
        req = LLMRequest(
            provider="kimi-code", model="kimi-coder",
            messages=[{"role": "user", "content": "Hi"}],
            extra_headers={"User-Agent": "custom-agent/1.0"},
        )
        _, headers = build_kimi_code_request(req)
        self.assertEqual(headers["User-Agent"], "custom-agent/1.0", "Extra headers should override defaults")

    def test_extra_body_fields(self):
        req = LLMRequest(
            provider="openai", model="gpt-4",
            messages=[{"role": "user", "content": "Hi"}],
            extra_body={"seed": 42, "logprobs": True},
        )
        body, _ = build_openai_request(req)
        self.assertEqual(body["seed"], 42)
        self.assertEqual(body["logprobs"], True)

    def test_unicode_content(self):
        """All providers handle unicode (Chinese) content"""
        messages = [{"role": "user", "content": "你好世界，测试中文！"}]
        for name, builder in BUILDERS.items():
            req = LLMRequest(provider=name, model="test", messages=messages)
            body, _ = builder(req)
            dumped = json.dumps(body, ensure_ascii=False)
            self.assertIn("你好世界", dumped, f"Provider {name} failed unicode serialization")

    def test_large_max_tokens(self):
        """Gemini uses maxOutputTokens, others use max_tokens"""
        req = LLMRequest(provider="gemini", model="gemini-pro",
                         messages=[{"role": "user", "content": "Hi"}], max_tokens=128000)
        body, _ = build_gemini_request(req)
        self.assertEqual(body["generationConfig"]["maxOutputTokens"], 128000)

        req2 = LLMRequest(provider="openai", model="gpt-4",
                          messages=[{"role": "user", "content": "Hi"}], max_tokens=128000)
        body2, _ = build_openai_request(req2)
        self.assertEqual(body2["max_tokens"], 128000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
