"""Training script for fine-tuning LLM on requirement analysis."""

import os
from typing import Dict

import torch
from datasets import load_from_disk
from dotenv import load_dotenv
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

from .dataset import create_requirement_dataset, prepare_training_data

# Load environment variables
load_dotenv()

# Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "distilgpt2")  # Smaller model for demo
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./models/requirement-chat-adapter")
DATASET_DIR = os.getenv("DATASET_DIR", "./data/processed")

# Training hyperparameters
LORA_R = int(os.getenv("LORA_R", "4"))  # Smaller for demo
LORA_ALPHA = int(os.getenv("LORA_ALPHA", "8"))
LORA_DROPOUT = float(os.getenv("LORA_DROPOUT", "0.1"))
LEARNING_RATE = float(os.getenv("LEARNING_RATE", "5e-4"))
NUM_EPOCHS = int(os.getenv("NUM_EPOCHS", "1"))  # Just 1 epoch for demo
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "2"))  # Smaller batch
GRADIENT_ACCUMULATION_STEPS = int(os.getenv("GRADIENT_ACCUMULATION_STEPS", "1"))


def load_model_and_tokenizer():
    """Load model and tokenizer with quantization."""
    print(f"Loading model: {MODEL_NAME}")

    # Quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    return model, tokenizer


def setup_lora_config():
    """Configure LoRA for efficient fine-tuning."""
    return LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["c_attn", "c_proj", "c_fc", "c_proj"] if "gpt" in MODEL_NAME.lower() else None,
    )


def tokenize_function(examples: Dict, tokenizer, max_length=512):
    """Tokenize the text."""
    return tokenizer(
        examples["text"],
        truncation=True,
        padding="max_length",
        max_length=max_length,
    )


def train_model():
    """Main training function."""
    print("Starting model training...")

    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer()

    # Prepare model for training
    model = prepare_model_for_kbit_training(model)

    # Setup LoRA
    lora_config = setup_lora_config()
    model = get_peft_model(model, lora_config)

    print(f"Trainable parameters: {model.print_trainable_parameters()}")

    # Load or create dataset
    if os.path.exists(f"{DATASET_DIR}/train"):
        print("Loading existing dataset...")
        train_dataset = load_from_disk(f"{DATASET_DIR}/train")
        val_dataset = load_from_disk(f"{DATASET_DIR}/validation")
    else:
        print("Creating new dataset...")
        datasets = create_requirement_dataset()
        training_data = prepare_training_data(datasets)
        train_dataset = training_data["train"]
        val_dataset = training_data["validation"]

    # Tokenize datasets
    print("Tokenizing datasets...")
    tokenized_train = train_dataset.map(
        lambda x: tokenize_function(x, tokenizer),
        batched=True,
        remove_columns=train_dataset.column_names
    )
    tokenized_val = val_dataset.map(
        lambda x: tokenize_function(x, tokenizer),
        batched=True,
        remove_columns=val_dataset.column_names
    )

    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,  # Causal LM
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        weight_decay=0.01,
        warmup_steps=100,
        logging_steps=10,
        save_steps=500,
        eval_steps=500,
        evaluation_strategy="steps",
        save_strategy="steps",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        fp16=True,
        report_to="wandb" if os.getenv("WANDB_API_KEY") else "none",
        run_name="requirement-chat-finetune",
    )

    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        data_collator=data_collator,
    )

    # Train the model
    print("Starting training...")
    trainer.train()

    # Save the model
    print(f"Saving model to {OUTPUT_DIR}")
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print("Training completed successfully!")


if __name__ == "__main__":
    train_model()