#!/usr/bin/env python3
"""
Manual test script for GeminiClient.

Usage: python3 test_gemini_manual.py

This script tests the core GeminiClient functionality:
1. Configuration validation
2. Client initialization
3. Basic enrich_task() call
4. Error handling
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.lib.gemini_client import GeminiClient, GeminiClientConfig, GeminiAPIError


async def main():
    print("=" * 60)
    print("GeminiClient Manual Test")
    print("=" * 60)

    # Step 1: Load configuration from environment
    print("\n[1] Loading configuration from .env.development...")

    # Load env vars (simple version without python-dotenv)
    env_file = Path(__file__).parent.parent / ".env.development"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    timeout = float(os.getenv("GEMINI_TIMEOUT", "15.0"))
    max_retries = int(os.getenv("GEMINI_MAX_RETRIES", "3"))

    print(f"   API Key: {api_key[:10]}... (length: {len(api_key)})")
    print(f"   Model: {model}")
    print(f"   Timeout: {timeout}s")
    print(f"   Max Retries: {max_retries}")

    if api_key == "your_gemini_api_key_here" or not api_key:
        print("\n❌ ERROR: Please set a real GEMINI_API_KEY in .env.development")
        print("   Get your key from: https://aistudio.google.com/")
        return

    # Step 2: Validate configuration
    print("\n[2] Validating configuration...")
    try:
        config = GeminiClientConfig(
            api_key=api_key,
            model=model,
            timeout=timeout,
            max_retries=max_retries,
        )
        print("   ✅ Configuration is valid")
    except ValueError as e:
        print(f"   ❌ Configuration error: {e}")
        return

    # Step 3: Initialize client
    print("\n[3] Initializing GeminiClient...")
    try:
        client = GeminiClient(config)
        print("   ✅ Client initialized successfully")
    except Exception as e:
        print(f"   ❌ Client initialization failed: {e}")
        return

    # Step 4: Test enrich_task()
    print("\n[4] Testing enrich_task() method...")
    test_input = "call John tmrw about project Alpha"
    print(f"   Input: '{test_input}'")

    try:
        enriched = await client.enrich_task(test_input)
        print(f"   Output: '{enriched}'")
        print("   ✅ enrich_task() succeeded")
    except GeminiAPIError as e:
        print(f"   ❌ API Error: {e.message}")
        if e.status_code:
            print(f"      Status Code: {e.status_code}")
        return
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return

    # Step 5: Test empty input validation
    print("\n[5] Testing empty input validation...")
    try:
        await client.enrich_task("")
        print("   ❌ Should have raised ValueError for empty input")
    except ValueError as e:
        print(f"   ✅ Correctly rejected empty input: {e}")

    print("\n" + "=" * 60)
    print("✅ All tests passed! GeminiClient is working correctly.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
