# AI Engine

<!--
  This folder contains the Python-based analysis service implementation.
  It performs NLP extraction, ambiguity detection, readability scoring,
  similarity, contradiction checks, and final requirement scoring.
-->

## Purpose

Analyze requirement text using NLP, similarity, contradiction, scoring, explainability, and LLM-powered chat modules.

## Responsibilities

- Parse requirement statements into structured forms
- Detect ambiguity and consistency issues
- Produce quality scores and explanation metadata
- Provide AI-powered chat for requirement improvement suggestions
- Expose analysis-friendly interfaces for the backend

## Features

### Core Analysis

- **NLP Parsing**: Extract actors, actions, and objects from requirements
- **Quality Scoring**: Calculate clarity, completeness, consistency metrics
- **Ambiguity Detection**: Identify vague or ambiguous terms
- **Similarity Analysis**: Compare against reference requirement patterns
- **Contradiction Detection**: Find internal inconsistencies

### AI Chat

- **Grok API Integration**: Uses xAI's Grok model for requirement analysis
- **Context Awareness**: Maintains conversation history
- **Specialized Knowledge**: Expert in requirements engineering best practices
- **Fallback Support**: Graceful degradation if API unavailable

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up environment variables:

Copy `.env.example` to `.env` and add your xAI API key:

```bash
cp ../.env.example .env
# Edit .env and set XAI_API_KEY=your_actual_api_key
```

Get your xAI API key from [xAI](https://x.ai).

3. (Optional) If you prefer local model training instead of API:

```bash
./train_model.sh
```

Note: The system now uses Grok API by default for chat responses. Local model training is optional.

3. Run the service:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Training the Chat Model

The chat functionality uses a fine-tuned LLM specialized for requirements analysis:

1. **Dataset Creation**: Automatically generates training data from requirement analysis patterns
2. **Fine-tuning**: Uses LoRA for efficient adaptation of base models
3. **Quantization**: 4-bit quantization for memory efficiency

### Environment Variables

Configure the model behavior in `.env`:

```env
MODEL_NAME=microsoft/DialoGPT-medium
ADAPTER_PATH=./models/requirement-chat-adapter
```

### Training Script

Run `./train_model.sh` to:

- Create training dataset
- Fine-tune the model
- Save adapter weights

The fine-tuned model will automatically be loaded by the chat endpoint.
