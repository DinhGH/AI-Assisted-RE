#!/usr/bin/env python
"""
🚀 FINE-TUNING SCRIPT FOR ISO 29148 REQUIREMENTS ANALYST
Supports both OpenAI and Local fine-tuning options
"""

import os
import json
import torch
from pathlib import Path

def check_environment():
    """Check if environment is ready for fine-tuning"""
    print("🔍 CHECKING ENVIRONMENT")
    print("="*50)

    # Check dataset
    json_file = Path("data/training_dataset_iso29148_500plus.json")
    jsonl_file = Path("data/training_dataset_iso29148_500plus.jsonl")

    if json_file.exists():
        print(f"✅ Dataset JSON: {json_file.stat().st_size / 1024:.1f} KB")
    else:
        print("❌ Dataset JSON not found")
        return False

    if jsonl_file.exists():
        print(f"✅ Dataset JSONL: {jsonl_file.stat().st_size / 1024:.1f} KB")
    else:
        print("❌ Dataset JSONL not found")
        return False

    # Check samples
    with open(json_file) as f:
        data = json.load(f)
    print(f"✅ Samples: {len(data)}")

    # Check PyTorch
    try:
        import torch
        print(f"✅ PyTorch: {torch.__version__} (CUDA: {torch.cuda.is_available()})")
    except ImportError:
        print("❌ PyTorch not installed")
        return False

    # Check Transformers
    try:
        import transformers
        print(f"✅ Transformers: {transformers.__version__}")
    except ImportError:
        print("❌ Transformers not installed")
        return False

    # Check OpenAI (optional)
    try:
        import openai
        print(f"✅ OpenAI: {openai.__version__}")
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            print("✅ OpenAI API key configured")
        else:
            print("⚠️  OpenAI API key not set (optional)")
    except ImportError:
        print("⚠️  OpenAI not installed (optional)")

    print("\n✅ ENVIRONMENT READY!")
    return True

def openai_fine_tune():
    """Fine-tune using OpenAI API"""
    print("\n🚀 STARTING OPENAI FINE-TUNING")
    print("="*50)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not set!")
        print("\n📝 SETUP INSTRUCTIONS:")
        print("1. Get API key: https://platform.openai.com/api-keys")
        print("2. Set environment variable:")
        print("   PowerShell: $env:OPENAI_API_KEY='your-key-here'")
        print("   CMD: set OPENAI_API_KEY=your-key-here")
        print("3. Or run: openai api configure --api-key YOUR_KEY")
        return

    try:
        import openai
        client = openai.OpenAI()

        # Upload file
        print("📤 Uploading dataset to OpenAI...")
        with open("data/training_dataset_iso29148_500plus.jsonl", "rb") as f:
            file_response = client.files.create(
                file=f,
                purpose="fine-tune"
            )
        file_id = file_response.id
        print(f"✅ File uploaded: {file_id}")

        # Start fine-tuning
        print("🎯 Starting fine-tuning job...")
        job_response = client.fine_tuning.jobs.create(
            training_file=file_id,
            model="gpt-3.5-turbo",
            hyperparameters={
                "n_epochs": 3,
                "batch_size": 32,
                "learning_rate_multiplier": 2.0
            }
        )
        job_id = job_response.id
        print(f"✅ Fine-tuning job created: {job_id}")

        print("\n📋 MONITORING INSTRUCTIONS:")
        print(f"Run: openai api fine_tunes.follow -i {job_id}")
        print("Or check status: openai api fine_tunes.list")
        print("\n⏱️  Expected time: 30-60 minutes")
        print("💰 Expected cost: $3-5")

        # Save job info
        with open("fine_tune_job.txt", "w") as f:
            f.write(f"Job ID: {job_id}\n")
            f.write(f"File ID: {file_id}\n")
            f.write("Model: gpt-3.5-turbo\n")
            f.write("Status: Training in progress\n")

        print("\n💾 Job info saved to: fine_tune_job.txt")
    except Exception as e:
        print(f"❌ Error: {e}")

def local_fine_tune():
    """Fine-tune locally using HuggingFace"""
    print("\n🚀 STARTING LOCAL FINE-TUNING")
    print("="*50)

    try:
        from transformers import (
            AutoTokenizer,
            AutoModelForCausalLM,
            TrainingArguments,
            Trainer,
            DataCollatorForLanguageModeling,
        )
        from datasets import Dataset
        import torch

        print("📚 Loading model and tokenizer...")
        model_name = "distilgpt2"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name)

        tokenizer.pad_token = tokenizer.eos_token

        print("📊 Loading dataset...")
        with open("data/training_dataset_iso29148_500plus.json") as f:
            samples = json.load(f)

        # Convert to training format
        texts = []
        for sample in samples:
            msg = sample['messages']
            text = f"System: {msg[0]['content']}\nUser: {msg[1]['content']}\nAssistant: {msg[2]['content']}"
            texts.append({"text": text})

        dataset = Dataset.from_dict({"text": [item["text"] for item in texts]})

        # Split dataset
        split_data = dataset.train_test_split(test_size=0.1, seed=42)
        train_dataset = split_data["train"]
        eval_dataset = split_data["test"]

        print(f"📈 Train samples: {len(train_dataset)}")
        print(f"🧪 Eval samples: {len(eval_dataset)}")

        # Tokenize
        def tokenize_function(examples):
            return tokenizer(
                examples["text"],
                padding="max_length",
                truncation=True,
                max_length=512,
            )

        print("🔄 Tokenizing datasets...")
        tokenized_train = train_dataset.map(tokenize_function, batched=True)
        tokenized_eval = eval_dataset.map(tokenize_function, batched=True)

        # Training arguments
        training_args = TrainingArguments(
            output_dir="./models/iso29148-requirements-analyst",
            overwrite_output_dir=True,
            num_train_epochs=3,
            per_device_train_batch_size=8,  # Smaller batch for CPU
            per_device_eval_batch_size=8,
            warmup_steps=100,
            weight_decay=0.01,
            logging_dir="./logs",
            logging_steps=10,
            eval_strategy="steps",
            eval_steps=50,
            save_strategy="steps",
            save_steps=100,
            load_best_model_at_end=True,
            save_total_limit=2,
            report_to="none",  # Disable wandb logging
        )

        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )

        # Trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_train,
            eval_dataset=tokenized_eval,
            data_collator=data_collator,
        )

        print("🎯 Starting training...")
        print("⏱️  This will take 2-5 hours on CPU...")
        trainer.train()

        print("💾 Saving model...")
        model.save_pretrained("./models/iso29148-requirements-analyst")
        tokenizer.save_pretrained("./models/iso29148-requirements-analyst")

        print("\n✅ LOCAL FINE-TUNING COMPLETE!")
        print("📁 Model saved to: ./models/iso29148-requirements-analyst")
        # Test the model
        print("\n🧪 TESTING MODEL...")
        test_input = "System: You are a senior software requirements analyst following ISO/IEC/IEEE 29148. Analyze software requirements professionally. Always respond in 4 structured parts: 1. Assessment 2. Review 3. Recommendation 4. Revision Guide. Be specific, critical, and avoid vague explanations. Ensure suggestions are measurable and testable.\nUser: System should be fast\nAssistant:"

        inputs = tokenizer(test_input, return_tensors="pt", max_length=200, truncation=True)
        outputs = model.generate(
            inputs["input_ids"],
            max_length=300,
            num_return_sequences=1,
            temperature=0.7,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )

        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"📝 Sample output: {response[len(test_input):]}")

    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Install missing packages:")
        print("   pip install torch transformers datasets accelerate")
        print("2. Check available RAM (need ~4GB)")
        print("3. For GPU acceleration, install CUDA version of PyTorch")

def main():
    """Main function"""
    print("🚀 ISO 29148 REQUIREMENTS ANALYST - FINE-TUNING")
    print("="*60)

    if not check_environment():
        print("\n❌ Environment not ready. Please check requirements.")
        return

    print("\n" + "="*60)
    print("🎯 CHOOSE FINE-TUNING OPTION:")
    print("="*60)
    print("1. OpenAI Fine-tuning (Recommended)")
    print("   ✅ Production quality, fast, easy")
    print("   ❌ Requires API key (~$3-5)")
    print()
    print("2. Local Fine-tuning (Free)")
    print("   ✅ No cost, full control, private")
    print("   ❌ Slower (2-5 hours), more setup")
    print()
    print("3. Exit")
    print()

    while True:
        try:
            choice = input("Enter your choice (1/2/3): ").strip()
            if choice == "1":
                openai_fine_tune()
                break
            elif choice == "2":
                local_fine_tune()
                break
            elif choice == "3":
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please enter 1, 2, or 3.")
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break

if __name__ == "__main__":
    main()