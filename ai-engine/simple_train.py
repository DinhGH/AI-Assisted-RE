#!/usr/bin/env python
"""Simple training script without wandb dependency."""

import os

# Disable wandb before imports
os.environ['WANDB_DISABLED'] = 'true'

from datasets import load_from_disk
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


def train_model():
    """Train the model without wandb."""
    # Load dataset
    print("📚 Loading datasets...")
    train_dataset = load_from_disk('./data/processed/train')
    val_dataset = load_from_disk('./data/processed/validation')

    # Load model and tokenizer
    print("🤖 Loading model: distilgpt2...")
    model_name = 'distilgpt2'
    model = AutoModelForCausalLM.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Format conversations
    def format_conversation(example):
        instruction = example['instruction']
        input_text = example['input']
        output_text = example['output']

        if input_text:
            text = f'Instruction: {instruction}\nInput: {input_text}\nResponse: {output_text}'
        else:
            text = f'Instruction: {instruction}\nResponse: {output_text}'

        return {'text': text}

    # Format datasets
    print("📝 Formatting datasets...")
    train_formatted = train_dataset.map(format_conversation)
    val_formatted = val_dataset.map(format_conversation)

    # Tokenize function
    def tokenize_function(examples):
        return tokenizer(
            examples['text'],
            truncation=True,
            padding='max_length',
            max_length=256,
        )

    # Tokenize datasets
    print("🔧 Tokenizing datasets...")
    tokenized_train = train_formatted.map(
        tokenize_function,
        batched=True,
        remove_columns=['instruction', 'input', 'output', '__index_level_0__']
    )
    tokenized_val = val_formatted.map(
        tokenize_function,
        batched=True,
        remove_columns=['instruction', 'input', 'output', '__index_level_0__']
    )

    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,  # Causal LM
    )

    # Training arguments
    print("⚙️  Setting up training arguments...")
    training_args = TrainingArguments(
        output_dir='./models/requirement-chat-model',
        num_train_epochs=1,
        per_device_train_batch_size=2,
        per_device_eval_batch_size=2,
        logging_steps=5,
        save_steps=100,
        eval_strategy='steps',
        eval_steps=10,
        save_total_limit=1,
        load_best_model_at_end=True,
        report_to=[],  # Disable all reporting
    )

    # Trainer
    print("🚀 Starting training...")
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        data_collator=data_collator,
    )

    trainer.train()

    # Save model
    print("💾 Saving model...")
    trainer.save_model('./models/requirement-chat-model')
    tokenizer.save_pretrained('./models/requirement-chat-model')

    print("✅ Model training completed successfully!")
    print("📦 Model saved to: ./models/requirement-chat-model")


if __name__ == "__main__":
    train_model()
