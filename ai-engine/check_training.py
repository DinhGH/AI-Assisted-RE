#!/usr/bin/env python
"""
📊 CHECK TRAINING STATUS AND RUN TESTS
"""

import os
import time
from pathlib import Path

def check_training_status():
    """Check if training is complete and run tests"""
    print("📊 CHECKING TRAINING STATUS")
    print("="*50)

    model_dir = Path("./models/iso29148-requirements-analyst")

    if model_dir.exists():
        files = list(model_dir.glob("*"))
        print(f"✅ Model directory exists with {len(files)} files")

        # Check for key files
        config_exists = (model_dir / "config.json").exists()
        model_exists = any(f.suffix in [".bin", ".safetensors"] for f in files)
        tokenizer_exists = (model_dir / "tokenizer_config.json").exists()

        print(f"   📄 Config: {'✅' if config_exists else '❌'}")
        print(f"   🤖 Model: {'✅' if model_exists else '❌'}")
        print(f"   🔤 Tokenizer: {'✅' if tokenizer_exists else '❌'}")

        if config_exists and model_exists and tokenizer_exists:
            print("\n🎉 TRAINING APPEARS COMPLETE!")
            print("🧪 Running model tests...")

            # Run the test script
            os.system("python test_model.py")
        else:
            print("\n⏳ Training still in progress...")
            print("   Run this script again later to check status")
    else:
        print("❌ Model directory not found")
        print("   Training may still be running or hasn't started")

    # Check for training logs
    logs_dir = Path("./logs")
    if logs_dir.exists():
        log_files = list(logs_dir.glob("*"))
        print(f"\n📝 Found {len(log_files)} log files in ./logs/")

if __name__ == "__main__":
    check_training_status()