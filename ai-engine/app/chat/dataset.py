"""Dataset creation for fine-tuning LLM on requirement analysis."""

import json
import os
import random
from typing import List, Dict, Any

import pandas as pd
from datasets import Dataset
from sklearn.model_selection import train_test_split


def create_requirement_dataset(
    requirements_file: str = "data/requirements.json",
    output_dir: str = "data/processed"
) -> Dict[str, Dataset]:
    """Create a dataset from requirements for fine-tuning."""

    # Sample conversations about requirements
    conversations = [
        {
            "instruction": "Analyze this requirement for clarity",
            "input": "The system shall allow users to login",
            "output": "This requirement lacks specificity. Consider: 'The system shall allow authenticated users to log in using their username and password within 3 seconds.'"
        },
        {
            "instruction": "Suggest improvements for this requirement",
            "input": "The application must be fast",
            "output": "Vague performance requirement. Specify measurable criteria: 'The application shall respond to user actions within 2 seconds under normal load conditions.'"
        },
        {
            "instruction": "Identify actors, actions, and objects",
            "input": "Users should be able to save documents",
            "output": "Actor: Users\nAction: save\nObject: documents\nSuggestion: 'Authenticated users shall be able to save documents to their personal workspace.'"
        },
        {
            "instruction": "Make this requirement testable",
            "input": "The system should be secure",
            "output": "Security is too broad. Consider: 'The system shall encrypt all user data using AES-256 and require multi-factor authentication for privileged operations.'"
        },
        {
            "instruction": "Check for ambiguity",
            "input": "The software will handle errors gracefully",
            "output": "Ambiguous terms: 'gracefully', 'errors'. Specify: 'When encountering validation errors, the system shall display clear error messages and allow users to correct input without data loss.'"
        },
        {
            "instruction": "Improve completeness",
            "input": "The API should work",
            "output": "Incomplete requirement. Add details: 'The REST API shall support CRUD operations for user management, return JSON responses, and handle HTTP status codes 200, 400, 401, 403, 404, and 500 appropriately.'"
        },
        {
            "instruction": "Add acceptance criteria",
            "input": "Users can search for products",
            "output": "Add measurable criteria: 'Given a user enters a search term, when they submit the search, then the system shall return relevant products within 1 second, displaying up to 50 results per page.'"
        },
        {
            "instruction": "Fix contradiction potential",
            "input": "The system shall be available 99.9% and allow maintenance windows",
            "output": "Potential contradiction. Clarify: 'The system shall be available 99.9% annually, excluding scheduled maintenance windows of up to 4 hours per month with 48-hour advance notice.'"
        },
        {
            "instruction": "Make it implementation-independent",
            "input": "Use SQL database for storage",
            "output": "Implementation-specific. Consider: 'The system shall persistently store user data with ACID properties and support concurrent access by multiple users.'"
        },
        {
            "instruction": "Add constraints",
            "input": "The system shall process payments",
            "output": "Add constraints: 'The system shall securely process credit card payments using PCI DSS compliant methods, supporting Visa, Mastercard, and American Express, with transaction fees not exceeding 2.9% + $0.30.'"
        }
    ]

    # Expand with variations
    expanded_conversations = []
    for conv in conversations:
        # Add variations
        variations = [
            conv,
            {
                "instruction": f"Please {conv['instruction'].lower()}",
                "input": conv["input"],
                "output": conv["output"]
            },
            {
                "instruction": f"Can you {conv['instruction'].lower()}?",
                "input": conv["input"],
                "output": conv["output"]
            }
        ]
        expanded_conversations.extend(variations)

    # Create DataFrame
    df = pd.DataFrame(expanded_conversations)

    # Split into train/validation
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)

    # Convert to HuggingFace datasets
    train_dataset = Dataset.from_pandas(train_df)
    val_dataset = Dataset.from_pandas(val_df)

    # Save datasets
    os.makedirs(output_dir, exist_ok=True)

    train_dataset.save_to_disk(f"{output_dir}/train")
    val_dataset.save_to_disk(f"{output_dir}/validation")

    # Save as JSON for inspection
    with open(f"{output_dir}/conversations.json", "w") as f:
        json.dump(expanded_conversations, f, indent=2)

    print(f"Created dataset with {len(train_dataset)} training and {len(val_dataset)} validation samples")

    return {
        "train": train_dataset,
        "validation": val_dataset
    }


def format_conversation(example: Dict[str, Any]) -> Dict[str, str]:
    """Format conversation for training."""
    instruction = example["instruction"]
    input_text = example["input"]
    output_text = example["output"]

    if input_text:
        formatted = f"Instruction: {instruction}\nInput: {input_text}\nResponse: {output_text}"
    else:
        formatted = f"Instruction: {instruction}\nResponse: {output_text}"

    return {"text": formatted}


def prepare_training_data(datasets: Dict[str, Dataset]) -> Dict[str, Dataset]:
    """Prepare datasets for training."""
    formatted_datasets = {}

    for split, dataset in datasets.items():
        formatted_datasets[split] = dataset.map(format_conversation)

    return formatted_datasets


if __name__ == "__main__":
    # Create dataset
    datasets = create_requirement_dataset()

    # Prepare for training
    training_data = prepare_training_data(datasets)

    print("Dataset preparation complete!")
    print(f"Training samples: {len(training_data['train'])}")
    print(f"Validation samples: {len(training_data['validation'])}")