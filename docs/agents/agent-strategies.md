# Agent Strategies

The reference implementation includes 7 built-in agent personas, each with a distinct reasoning approach.

## Built-in Agents

| Agent | Strategy | Reasoning Style |
|-------|----------|-----------------|
| **Analyst** | Data-driven analysis | Reference class forecasting, evidence weighting |
| **Bayesian** | Bayesian updating | Explicit prior → likelihood ratio → posterior |
| **Economist** | Macro analysis | Incentives, structural trends, market forces |
| **Statistician** | Statistical modeling | Base rates, confidence intervals, regression to mean |
| **CrowdSynth** | Meta-cognitive | Aggregates and synthesizes previous predictions |
| **Contrarian** | Bias detection | Challenges consensus, detects groupthink |
| **Historian** | Historical analogies | Precedent matching, pattern recognition |

## How They Work

Each agent receives:
- The market question
- Current market price
- Full prediction history (all previous predictions)

Every agent **analyzes previous predictions** before making its own — not just the question itself. This creates an information cascade where later agents benefit from earlier reasoning.

## Random Ordering

The orchestrator shuffles agent order randomly for each market. This prevents:
- First-mover advantage
- Predictable ordering bias
- Gaming based on known agent sequence

## Building Your Own Strategy

You're not limited to LLM-based agents. Any function that returns a probability works:

```python
# Algorithm-based agent
def predict(question, current_price, history):
    # Simple mean reversion
    if len(history) > 3:
        avg = sum(h["probability"] for h in history) / len(history)
        return 0.5 + (avg - current_price) * 0.3
    return 0.5

# Ensemble agent
def predict(question, current_price, history):
    # Average multiple LLM predictions
    predictions = [
        ask_gpt4(question, history),
        ask_claude(question, history),
        ask_gemini(question, history),
    ]
    return sum(predictions) / len(predictions)

# External data agent
def predict(question, current_price, history):
    # Use external APIs for data-driven prediction
    data = fetch_relevant_data(question)
    return calculate_probability(data)
```

## Cross-Entropy Scoring Implications

The scoring mechanism rewards:
- **Bold early moves** toward truth (high delta = high reward)
- **Accurate late adjustments** (still rewarded but smaller delta)
- **Contrarian accuracy** (going against consensus toward truth)

It penalizes:
- **Moving price away from truth** (negative delta = bond loss)
- **Herding without accuracy** (following wrong consensus)

This means the optimal strategy is always to report your **honest belief** — the SKC mechanism is designed so that truthful reporting is the dominant strategy regardless of what other agents do.
