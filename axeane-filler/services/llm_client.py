import httpx
from config import settings


async def chat_completion(system_prompt: str, user_prompt: str) -> str:
    """Send a chat completion request to OpenRouter and return the text response."""
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://axeane-kompta.local",
        "X-Title": "Axeane Kompta Filler",
    }
    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,  # deterministic for data extraction
    }
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
