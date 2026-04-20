#!/usr/bin/env python
"""
🧪 TEST FINE-TUNED MODEL FOR ISO 29148 REQUIREMENTS ANALYSIS
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os

def test_fine_tuned_model():
    """Test the fine-tuned model with sample requirements"""
    print("🧪 TESTING FINE-TUNED ISO 29148 REQUIREMENTS ANALYST")
    print("="*60)

    model_path = "./models/iso29148-requirements-analyst"

    if not os.path.exists(model_path):
        print("❌ Model not found! Please run fine_tune.py first.")
        return

    try:
        print("📚 Loading fine-tuned model and tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(model_path)

        # Set pad token if not set
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        print("✅ Model loaded successfully!")

        # Test cases
        test_requirements = [
            "System should be fast",
            "The application must handle 1000 concurrent users",
            "User authentication is required",
            "Data should be encrypted at rest",
            "Response time should be less than 2 seconds"
        ]

        system_prompt = """You are a senior software requirements analyst following ISO/IEC/IEEE 29148. Analyze software requirements professionally. Always respond in 4 structured parts: 1. Assessment 2. Review 3. Recommendation 4. Revision Guide. Be specific, critical, and avoid vague explanations. Ensure suggestions are measurable and testable."""

        print("\n" + "="*60)
        print("🧪 TESTING WITH SAMPLE REQUIREMENTS")
        print("="*60)

        for i, requirement in enumerate(test_requirements, 1):
            print(f"\n📝 Test Case {i}: {requirement}")
            print("-" * 40)

            prompt = f"System: {system_prompt}\nUser: {requirement}\nAssistant:"

            inputs = tokenizer(prompt, return_tensors="pt", max_length=300, truncation=True)

            with torch.no_grad():
                outputs = model.generate(
                    inputs["input_ids"],
                    max_length=500,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token,
                    eos_token_id=tokenizer.eos_token
                )

            response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Extract only the assistant's response
            assistant_response = response.split("Assistant:")[-1].strip()

            print(assistant_response)

        print("\n" + "="*60)
        print("✅ MODEL TESTING COMPLETE!")
        print("📊 Check the responses above for ISO 29148 compliance")
        print("🔍 Look for: 4-part structure, specific suggestions, measurable criteria")

    except Exception as e:
        print(f"❌ Error testing model: {e}")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Ensure fine_tune.py completed successfully")
        print("2. Check if model files exist in ./models/iso29148-requirements-analyst/")
        print("3. Verify PyTorch and transformers are installed")

if __name__ == "__main__":
    test_fine_tuned_model()