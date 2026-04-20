#!/usr/bin/env python
"""
🧠 LLM FINE-TUNING SCRIPT - distilgpt2 for Requirement Analysis
Trains a specialized language model for requirement improvement and analysis chat.
"""

import os
import sys
from pathlib import Path

os.environ['WANDB_DISABLED'] = 'true'

# Add ai-engine to path
ai_engine_path = Path(__file__).parent
sys.path.insert(0, str(ai_engine_path))


def train_llm_simple():
    """Train LLM using simple approach without complex setup."""
    print("\n" + "="*80)
    print("🧠 TRAINING LLM - DISTILGPT2 FOR REQUIREMENT ANALYSIS")
    print("="*80)
    
    try:
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
        from datasets import load_from_disk
        import torch
        
        print("\n1️⃣ Loading model and tokenizer...")
        model_name = 'distilgpt2'
        model = AutoModelForCausalLM.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        print(f"   ✅ Loaded {model_name}")
        
        # Try to load processed dataset
        dataset_dir = './data/processed'
        
        if Path(dataset_dir).exists() and Path(f'{dataset_dir}/train').exists():
            print("\n2️⃣ Loading processed datasets...")
            try:
                train_dataset = load_from_disk(f'{dataset_dir}/train')
                val_dataset = load_from_disk(f'{dataset_dir}/validation')
                print(f"   ✅ Loaded train: {len(train_dataset)} samples")
                print(f"   ✅ Loaded validation: {len(val_dataset)} samples")
            except Exception as e:
                print(f"   ⚠️  Could not load processed dataset: {e}")
                print("   Creating synthetic dataset...")
                
                # Create synthetic dataset for demonstration
                from datasets import Dataset
                
                synthetic_data = {
                    'instruction': [
                        'Analyze this requirement for clarity',
                        'Identify ambiguous terms in this requirement',
                        'Suggest improvements for this requirement',
                        'Check if this requirement is testable',
                        'Improve requirement clarity'
                    ] * 5,
                    'input': [
                        'The system should be fast',
                        'The application must be easy to use',
                        'Users can search for products',
                        'The system should handle errors',
                        'Data shall be procesed quickly'
                    ] * 5,
                    'output': [
                        'The system should respond within 500ms (p95)',
                        'The application shall provide an intuitive interface with 80% user task completion on first attempt',
                        'Users shall be able to search for products by name, category, price range, and availability',
                        'The system shall catch and log all runtime errors with appropriate user-facing error messages',
                        'Data processing shall complete within 2 seconds for datasets up to 1 million records'
                    ] * 5
                }
                
                train_dataset = Dataset.from_dict(synthetic_data)
                val_dataset = Dataset.from_dict(synthetic_data)
                
                print(f"   ✅ Created synthetic dataset: {len(train_dataset)} samples")
        else:
            print("\n2️⃣ Creating synthetic dataset for LLM training...")
            from datasets import Dataset
            
            synthetic_data = {
                'instruction': [
                    'Analyze this requirement for clarity',
                    'Identify ambiguous terms in this requirement',
                    'Suggest improvements for this requirement',
                    'Check if this requirement is testable',
                    'Improve requirement clarity',
                    'Fix non-compliance issues',
                    'Add quantifiable metrics',
                    'Ensure implementation independence'
                ] * 10,
                'input': [
                    'The system should be fast',
                    'The application must be easy to use',
                    'Users can search for products',
                    'The system should handle errors',
                    'Data shall be processed quickly',
                    'Users can log in',
                    'The system should be secure',
                    'Reports should be generated'
                ] * 10,
                'output': [
                    'The system shall respond to user actions within 500ms (p95 latency)',
                    'The application shall provide an intuitive interface with 80% task completion rate on first attempt',
                    'Users shall be able to search for products by name, category, price range, and availability status',
                    'The system shall catch all runtime errors and display appropriate user-facing error messages',
                    'Data processing operations shall complete within 2 seconds for datasets up to 1 million records',
                    'Users shall authenticate using username and password with minimum 8 character requirement',
                    'The system shall encrypt sensitive data using AES-256-GCM encryption algorithm',
                    'The system shall generate business reports within 5 minutes in PDF, CSV, and Excel formats'
                ] * 10
            }
            
            train_dataset = Dataset.from_dict(synthetic_data)
            val_dataset = Dataset.from_dict(synthetic_data[:20])
            
            print(f"   ✅ Created training dataset: {len(train_dataset)} samples")
            print(f"   ✅ Created validation dataset: {len(val_dataset)} samples")
        
        # Format and tokenize
        print("\n3️⃣ Formatting and tokenizing...")
        
        def format_conversation(example):
            instruction = example.get('instruction', '')
            input_text = example.get('input', '')
            output_text = example.get('output', '')
            
            if input_text:
                text = f'Instruction: {instruction}\nInput: {input_text}\nResponse: {output_text}\n\n'
            else:
                text = f'Instruction: {instruction}\nResponse: {output_text}\n\n'
            
            return {'text': text}
        
        train_formatted = train_dataset.map(format_conversation)
        val_formatted = val_dataset.map(format_conversation)
        
        def tokenize_function(examples):
            return tokenizer(
                examples['text'],
                truncation=True,
                padding='max_length',
                max_length=256,
            )
        
        print("   🔄 Tokenizing training data...")
        tokenized_train = train_formatted.map(tokenize_function, batched=True, remove_columns=['instruction', 'input', 'output'])
        
        print("   🔄 Tokenizing validation data...")
        tokenized_val = val_formatted.map(tokenize_function, batched=True, remove_columns=['instruction', 'input', 'output'])
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )
        
        print("\n4️⃣ Setting up training arguments...")
        
        # Fixed training arguments
        training_args = TrainingArguments(
            output_dir='./models/distilgpt2-requirement-finetuned',
            num_train_epochs=2,
            per_device_train_batch_size=4,
            per_device_eval_batch_size=4,
            warmup_steps=10,
            weight_decay=0.01,
            logging_dir='./logs/llm_training',
            logging_steps=5,
            eval_strategy='epoch',  # Changed to per epoch
            save_strategy='epoch',
            save_total_limit=2,
            load_best_model_at_end=True,
            report_to=[],
        )
        
        # Trainer
        print("   ✅ Training arguments configured")
        
        print("\n5️⃣ Starting LLM training...")
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_train,
            eval_dataset=tokenized_val,
            data_collator=data_collator,
        )
        
        trainer.train()
        
        print("\n6️⃣ Saving fine-tuned model...")
        model_output_dir = './models/distilgpt2-requirement-finetuned'
        Path(model_output_dir).mkdir(parents=True, exist_ok=True)
        
        model.save_pretrained(model_output_dir)
        tokenizer.save_pretrained(model_output_dir)
        
        print(f"   ✅ Model saved to {model_output_dir}")
        
        # Test the model
        print("\n7️⃣ Testing fine-tuned model...")
        test_prompt = "Instruction: Improve this requirement:\nInput: The system should be fast\nResponse:"
        
        inputs = tokenizer.encode(test_prompt, return_tensors='pt')
        outputs = model.generate(inputs, max_length=100, temperature=0.7, top_p=0.9)
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"\n   📝 Test Input: {test_prompt}")
        print(f"   📝 Generated: {generated_text[:200]}...")
        
        print("\n" + "="*80)
        print("✨ LLM FINE-TUNING COMPLETED SUCCESSFULLY!")
        print("="*80)
        print(f"\n✅ Model saved to: {model_output_dir}")
        print("✅ Ready for requirement improvement chat!")
        
        return True
        
    except ImportError as e:
        print(f"\n❌ Required packages not installed: {e}")
        print("\nInstall with:")
        print("  pip install transformers torch datasets")
        return False
    
    except Exception as e:
        print(f"\n❌ Error during LLM training: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function."""
    print("\n" + "="*80)
    print("🚀 LLM FINE-TUNING - DISTILGPT2 FOR REQUIREMENT ANALYSIS")
    print("="*80)
    
    success = train_llm_simple()
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
