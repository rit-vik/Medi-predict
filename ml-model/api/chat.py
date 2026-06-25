"""
chat.py — Handles chatbot logic using Google's free Gemini API.
Get a free API key at: https://aistudio.google.com
"""

import os
from google import genai
from .chat_schemas import ChatRequest

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a friendly, knowledgeable health assistant inside the \
MediPredict AI app. Your job:

1. If the user has prediction results (provided as context below), help them \
understand their predicted disease(s), risk score, and estimated treatment costs \
in plain, reassuring language.
2. Answer general health questions (symptoms, prevention, lifestyle) factually \
and conservatively.
3. ALWAYS include a brief disclaimer that you are not a substitute for a \
licensed doctor, and recommend they consult one for diagnosis or treatment \
decisions — especially for anything urgent or severe.
4. Keep answers concise (3-6 sentences) and conversational, not clinical jargon \
unless the user asks for technical detail.
5. Never give specific drug dosages or prescriptions.
6. If symptoms described sound like a medical emergency (chest pain, difficulty \
breathing, severe bleeding, stroke symptoms, etc.), tell the user to seek \
emergency care immediately.
"""


def build_context_block(context) -> str:
    """Turns the patient's prediction result into a text block for Gemini."""
    if not context:
        return ""

    lines = ["\n\n--- Patient's Current Assessment ---"]

    if context.top_diseases:
        lines.append("Predicted conditions:")
        for d in context.top_diseases:
            lines.append(
                f"  - {d.get('disease')}: {d.get('probability')}% "
                f"probability, {d.get('severity')} severity"
            )

    if context.risk_score is not None:
        lines.append(f"Overall risk score: {context.risk_score}%")

    if context.estimated_cost:
        cost = context.estimated_cost
        lines.append(
            f"Estimated treatment cost: ₹{cost.get('min_inr')} - ₹{cost.get('max_inr')}"
        )

    lines.append("--- End of Assessment ---\n")
    return "\n".join(lines)


def get_chat_response(request: ChatRequest) -> str:
    context_block = build_context_block(request.context)

    # Build conversation history in Gemini's format
    # Gemini uses "model" instead of "assistant"
    contents = []
    for msg in request.history[-10:]:
        role = "model" if msg.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg.content}]})

    # Inject context into the latest user message if present
    user_content = request.message
    if context_block:
        user_content = f"{context_block}\n\nUser question: {request.message}"

    contents.append({"role": "user", "parts": [{"text": user_content}]})

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "max_output_tokens": 500,
        },
    )

    return response.text