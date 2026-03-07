#!/usr/bin/env python3
"""
Yiling Protocol — Webhook Agent Template

A minimal webhook server that receives prediction requests from the
Yiling Protocol orchestrator and returns probability predictions.

This is the simplest way to connect your own AI agent to Yiling Protocol.

Step 1: Register your agent:
    curl -X POST http://localhost:8000/api/agents/register \
      -H "Content-Type: application/json" \
      -d '{"name": "MyAgent", "webhook_url": "http://YOUR_IP:5001/predict", "wallet_address": "0x..."}'

Step 2: Run this server:
    pip install flask openai
    python webhook_agent_template.py

Step 3: That's it! When a new market is created, your agent will be called.

Configure via environment variables:
  OPENAI_API_KEY   - Your OpenAI API key (or swap with any LLM)
  PORT             - Server port (default: 5001)
"""

import os
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

# =====================================================================
# CHOOSE YOUR LLM — Uncomment one of these sections
# =====================================================================

# --- Option A: OpenAI (GPT-4o-mini) ---
from openai import OpenAI
llm_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def ask_llm(question: str, current_price: float, history: list) -> dict:
    response = llm_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a sharp prediction market analyst. Analyze the question and market data, then provide your probability estimate."},
            {"role": "user", "content": f"""
Market Question: {question}
Current Market Price: {current_price} (probability)
Previous Predictions: {json.dumps(history[:5], indent=2)}

What probability do you assign to this question?
Respond in JSON: {{"probability": 0.XX, "reasoning": "your reasoning", "confidence": 0.XX}}
Rules: probability must be 0.02-0.98, confidence is 0-1."""}
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    return json.loads(response.choices[0].message.content)


# --- Option B: Anthropic (Claude) --- (uncomment below, comment Option A)
# import anthropic
# llm_client = anthropic.Anthropic()
#
# def ask_llm(question, current_price, history):
#     msg = llm_client.messages.create(
#         model="claude-sonnet-4-5-20250929",
#         max_tokens=500,
#         messages=[{"role": "user", "content": f"""You are a prediction market agent.
# Question: {question}
# Current price: {current_price}
# History: {json.dumps(history[:5])}
# Respond as JSON: {{"probability": 0.XX, "reasoning": "...", "confidence": 0.XX}}"""}]
#     )
#     return json.loads(msg.content[0].text)


# --- Option C: Simple heuristic (no LLM needed) ---
# def ask_llm(question, current_price, history):
#     # Mean-reversion strategy: push toward 0.5
#     prob = current_price + (0.5 - current_price) * 0.3
#     return {
#         "probability": max(0.02, min(0.98, prob)),
#         "reasoning": f"Mean-reversion from {current_price:.2f} toward 0.50",
#         "confidence": 0.5,
#     }


# =====================================================================
# WEBHOOK ENDPOINT — Don't modify this
# =====================================================================

@app.route("/predict", methods=["POST"])
def predict():
    """Handle prediction request from Yiling Protocol orchestrator."""
    data = request.json

    if data.get("event") != "predict_request":
        return jsonify({"error": "Unknown event"}), 400

    question = data["question"]
    current_price = data["current_price"]
    history = data.get("prediction_history", [])

    print(f"\n[Predict Request] Market #{data.get('market_id')}")
    print(f"  Question: {question}")
    print(f"  Current price: {current_price}")

    try:
        result = ask_llm(question, current_price, history)
    except Exception as e:
        print(f"  LLM Error: {e}")
        # Fallback: return current price with low confidence
        result = {
            "probability": current_price,
            "reasoning": f"LLM error, defaulting to current price: {e}",
            "confidence": 0.0,
        }

    # Clamp probability
    prob = max(0.02, min(0.98, float(result.get("probability", 0.5))))
    result["probability"] = prob

    print(f"  Prediction: {prob:.4f} (conf: {result.get('confidence', 'N/A')})")
    return jsonify(result)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "agent": "webhook_template"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    print(f"Yiling Protocol — Webhook Agent")
    print(f"Listening on http://0.0.0.0:{port}")
    print(f"Endpoint: POST /predict")
    app.run(host="0.0.0.0", port=port, debug=False)
