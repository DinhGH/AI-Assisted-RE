#!/usr/bin/env python3
"""Test script for xAI Grok API."""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_API_URL = "https://api.x.ai/v1/responses"
MODEL_NAME = "grok-4.20-reasoning"

def test_api():
    if not XAI_API_KEY:
        print("XAI_API_KEY not set")
        return

    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL_NAME,
        "input": "What is the meaning of life, the universe, and everything?"
    }

    try:
        response = requests.post(XAI_API_URL, headers=headers, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Response:", result)
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_api()