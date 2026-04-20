#!/bin/bash

# Training script for the requirement chat LLM

echo "🚀 Starting LLM training for requirement analysis..."

# Navigate to ai-engine directory
cd "$(dirname "$0")"

# Install dependencies if needed
pip install -r requirements.txt

# Create dataset
echo "📊 Creating training dataset..."
python -m app.chat.dataset

# Train the model
echo "🤖 Training the model..."
python -m app.chat.train

echo "✅ Training completed! Model saved to ./models/requirement-chat-adapter"
echo "🔄 Restart the AI engine to use the fine-tuned model."