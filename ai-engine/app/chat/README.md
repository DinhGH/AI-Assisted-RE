# Chat Module

This module provides LLM-based chat functionality for requirement analysis and improvement suggestions.

## Features

- **LLM Integration**: Uses fine-tuned language models for intelligent responses
- **Context Awareness**: Maintains conversation history and session context
- **Requirement Focus**: Specialized in software requirements engineering
- **Memory Efficient**: Uses quantization and LoRA for optimal performance

## Components

### llm.py

Main LLM interface with response generation capabilities.

### dataset.py

Dataset creation and preparation for fine-tuning.

### train.py

Training script for fine-tuning models on requirement analysis tasks.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set environment variables in `.env`:

```env
MODEL_NAME=microsoft/DialoGPT-medium
ADAPTER_PATH=./models/requirement-chat-adapter
WANDB_API_KEY=your_wandb_key  # optional
```

3. Train the model:

```bash
cd app/chat
python train.py
```

4. The fine-tuned adapter will be saved to `./models/requirement-chat-adapter`

## Usage

The chat endpoint automatically loads the fine-tuned model. If no adapter is found, it falls back to the base model.

## Training Data

The dataset includes conversations about:

- Requirement clarity analysis
- Ambiguity detection
- Testability improvements
- Actor/action/object identification
- Acceptance criteria suggestions

## Model Architecture

- **Base Model**: DialoGPT-medium (can be changed via MODEL_NAME)
- **Fine-tuning**: LoRA (Low-Rank Adaptation) for efficiency
- **Quantization**: 4-bit quantization for memory optimization
