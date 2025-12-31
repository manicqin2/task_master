#!/usr/bin/env python3
"""
Debug script to see raw Gemini API response for enrichment.
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
env_file = Path(__file__).parent.parent / ".env.development"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value

api_key = os.getenv("GEMINI_API_KEY", "")

if not api_key or api_key == "your_gemini_api_key_here":
    print("ERROR: No valid API key")
    sys.exit(1)

# Use google.genai directly to debug
import google.genai as genai

client = genai.Client(api_key=api_key)

test_input = "urgent meeting with Sarah and Mike tmrw at 3pm for Q4 review #quarterly-review"

system_prompt = (
    "You are a task enrichment assistant. Take the user's informal task description "
    "and improve it by:\n"
    "1. Correcting spelling errors\n"
    "2. Expanding abbreviations (e.g., 'tmrw' -> 'tomorrow')\n"
    "3. Making it clearer and more action-oriented\n"
    "4. Preserving ALL important details (people, dates, projects, context)\n\n"
    "CRITICAL: You MUST include the COMPLETE task in your response. Do NOT truncate or "
    "shorten the output. Keep ALL names, dates, times, projects, tags, and context.\n\n"
    "Return ONLY the improved task description as a complete sentence, nothing else."
)

print("=" * 60)
print("DEBUG: Raw Gemini API Response")
print("=" * 60)
print(f"Input: '{test_input}'")
print()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"{system_prompt}\n\nTask to improve: {test_input}",
    config={
        "temperature": 0.1,
        "max_output_tokens": 300,
    },
)

print(f"Response type: {type(response)}")
print(f"Response.text: '{response.text}'")
print(f"Response.text length: {len(response.text)}")
print()

# Check if there's more info in the response object
if hasattr(response, 'candidates'):
    print(f"Number of candidates: {len(response.candidates)}")
    for i, candidate in enumerate(response.candidates):
        print(f"\nCandidate {i}:")
        if hasattr(candidate, 'content'):
            print(f"  Content: {candidate.content}")
        if hasattr(candidate, 'finish_reason'):
            print(f"  Finish reason: {candidate.finish_reason}")

if hasattr(response, 'usage_metadata'):
    print(f"\nUsage metadata: {response.usage_metadata}")
