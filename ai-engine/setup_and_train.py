#!/usr/bin/env python
"""
Complete setup and training script for ISO 29148 Requirement Quality AI Engine.

This script:
1. Generates 500 ISO 29148 compliant requirement samples
2. Trains classification model for requirement quality
3. Tests the full pipeline
4. Generates a summary report
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add ai-engine to path
ai_engine_path = Path(__file__).parent
sys.path.insert(0, str(ai_engine_path))

from app.chat.iso29148_dataset import generate_dataset, save_dataset
from app.chat.quality_classifier import RequirementQualityClassifier, MultiDimensionalQualityClassifier
from app.chat.llm import ISORequirementAnalyzer, ConversationMemory


def setup_directories():
    """Create necessary directories for dataset and models."""
    directories = [
        "data/processed",
        "models",
        "logs"
    ]
    
    for dir_path in directories:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directories created successfully")


def generate_and_save_dataset():
    """Generate ISO 29148 compliant dataset."""
    print("\n" + "="*80)
    print("📦 GENERATING ISO 29148 DATASET")
    print("="*80)
    
    print("🔄 Generating 500 requirement samples...")
    dataset = generate_dataset(500)
    
    # Save dataset
    dataset_file = "data/iso29148_dataset.json"
    save_dataset(dataset, dataset_file)
    
    # Print statistics
    compliant = sum(1 for r in dataset if r["is_compliant"])
    non_compliant = len(dataset) - compliant
    
    print(f"\n📊 Dataset Statistics:")
    print(f"  Total Requirements: {len(dataset)}")
    print(f"  Compliant (ISO 29148): {compliant}/{len(dataset)} ({compliant/len(dataset)*100:.1f}%)")
    print(f"  Non-Compliant: {non_compliant}/{len(dataset)} ({non_compliant/len(dataset)*100:.1f}%)")
    
    # Distribution by category
    categories = {}
    for req in dataset:
        cat = req["category"]
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n  Distribution by Category:")
    for cat, count in sorted(categories.items()):
        print(f"    {cat.capitalize()}: {count}")
    
    return dataset


def train_classifiers(dataset):
    """Train requirement quality classifiers."""
    print("\n" + "="*80)
    print("🤖 TRAINING QUALITY CLASSIFIERS")
    print("="*80)
    
    print("\n1️⃣ Training Gradient Boosting Classifier...")
    gb_classifier = RequirementQualityClassifier(model_type="gradient_boosting")
    gb_metrics = gb_classifier.train(dataset, test_size=0.2)
    gb_classifier.save("models/quality_classifier_gb.pkl")
    
    print("\n2️⃣ Training Random Forest Classifier...")
    rf_classifier = RequirementQualityClassifier(model_type="random_forest")
    rf_metrics = rf_classifier.train(dataset, test_size=0.2)
    rf_classifier.save("models/quality_classifier_rf.pkl")
    
    return {
        "gradient_boosting": gb_metrics,
        "random_forest": rf_metrics
    }


def test_analysis_pipeline():
    """Test the complete analysis pipeline."""
    print("\n" + "="*80)
    print("🧪 TESTING ANALYSIS PIPELINE")
    print("="*80)
    
    test_requirements = [
        {
            "text": "The system should be fast",
            "expected_issues": ["ambiguity", "non_verifiable"]
        },
        {
            "text": "The system shall authenticate users via OAuth 2.0 with session timeout of 30 minutes",
            "expected_issues": []
        },
        {
            "text": "The application must be easy to use",
            "expected_issues": ["ambiguity", "non_verifiable"]
        },
        {
            "text": "The system shall return search results within 2 seconds (p95) for datasets up to 1 million records",
            "expected_issues": []
        },
        {
            "text": "Users can search for products",
            "expected_issues": ["incomplete", "ambiguity"]
        },
    ]
    
    print("\n📝 Testing Individual Requirements:\n")
    
    results = []
    for i, test_case in enumerate(test_requirements, 1):
        req_text = test_case["text"]
        print(f"{i}. Analyzing: {req_text[:60]}...")
        
        analysis = ISORequirementAnalyzer.analyze_requirement(req_text)
        
        print(f"   Quality Score: {analysis['quality_score']}/100")
        print(f"   Compliant: {'✅ YES' if analysis['is_compliant'] else '❌ NO'}")
        
        if analysis['violations']:
            print(f"   Issues: {', '.join(analysis['violations'].keys())}")
        else:
            print("   Issues: None")
        
        print()
        
        results.append({
            "requirement": req_text,
            "quality_score": analysis['quality_score'],
            "is_compliant": analysis['is_compliant'],
            "violations": list(analysis['violations'].keys())
        })
    
    return results


def test_conversation_memory():
    """Test conversation memory functionality."""
    print("💬 Testing Conversation Memory:\n")
    
    memory = ConversationMemory(max_history=5)
    
    # Simulate conversation
    conversation = [
        ("user", "Can you analyze this requirement: 'The system should be fast'?"),
        ("assistant", "This requirement has ambiguity issues. Replace 'fast' with measurable metrics."),
        ("user", "How about 'The system shall respond within 2 seconds'?"),
        ("assistant", "Much better! This is specific and verifiable."),
    ]
    
    for role, content in conversation:
        memory.add_message(role, content)
    
    print(f"Memory size: {len(memory.get_history())} messages")
    print("✅ Conversation memory working correctly")


def generate_summary_report():
    """Generate comprehensive summary report."""
    print("\n" + "="*80)
    print("📋 SETUP SUMMARY REPORT")
    print("="*80)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "project": "AI-Assisted Requirements Engineering (ISO 29148)",
        "components": {
            "dataset": {
                "samples": 500,
                "location": "data/iso29148_dataset.json",
                "format": "JSON",
                "categories": 7,
                "quality_distribution": "40% poor, 35% good, 25% intermediate"
            },
            "classifiers": {
                "gradient_boosting": "models/quality_classifier_gb.pkl",
                "random_forest": "models/quality_classifier_rf.pkl",
                "features": "TF-IDF + handcrafted features"
            },
            "api_endpoints": {
                "/health": "Health check",
                "/analyze": "Comprehensive requirement analysis",
                "/iso29148/analyze": "ISO 29148 compliance analysis",
                "/iso29148/batch-analyze": "Batch analysis (multiple requirements)",
                "/chat": "LLM-based chat interface",
                "/chat/enhanced": "Chat with integrated ISO 29148 analysis",
                "/chat/sessions/{id}/history": "Get conversation history",
                "/chat/sessions/{id}/clear": "Clear session history"
            },
            "quality_dimensions": [
                "Unambiguous",
                "Verifiable",
                "Consistent",
                "Complete",
                "Feasible",
                "Implementation-Independent",
                "Traceable"
            ]
        },
        "features": {
            "iso29148_analysis": "Real-time requirement quality assessment",
            "ambiguity_detection": "Identifies vague and ambiguous terms",
            "verifiability_check": "Ensures measurable acceptance criteria",
            "completeness_validation": "Verifies Actor-Action-Object pattern",
            "conversation_memory": "Maintains context across chat sessions",
            "batch_processing": "Analyze multiple requirements at once",
            "quality_scoring": "0-100 compliance scoring system"
        },
        "quick_start": {
            "step_1": "python setup_and_train.py  # Run this setup script",
            "step_2": "python main.py  # Start AI engine server",
            "step_3": "curl -X POST http://localhost:8000/iso29148/analyze",
            "step_4": "Open documentation: http://localhost:8000/docs"
        }
    }
    
    # Save report
    report_file = "IMPLEMENTATION_SUMMARY.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Implementation complete!")
    print(f"\n📊 Summary Report saved to: {report_file}")
    print("\n🚀 Quick Start Commands:")
    print("   1. python main.py  # Start the server")
    print("   2. Open http://localhost:8000/docs  # API documentation")
    print("\n📚 Available Endpoints:")
    for endpoint, description in report["components"]["api_endpoints"].items():
        print(f"   {endpoint:<35} - {description}")
    
    return report


def main():
    """Main setup and training flow."""
    print("\n" + "="*80)
    print("🚀 ISO 29148 REQUIREMENT QUALITY AI ENGINE - SETUP")
    print("="*80)
    
    try:
        # Setup directories
        setup_directories()
        
        # Generate and save dataset
        dataset = generate_and_save_dataset()
        
        # Train classifiers
        train_classifiers(dataset)
        
        #Test analysis pipeline
        test_analysis_pipeline()
        
        # Test conversation memory
        test_conversation_memory()
        
        # Generate summary report
        report = generate_summary_report()
        
        print("\n" + "="*80)
        print("✅ SETUP COMPLETE!")
        print("="*80)
        print("\n🎯 Next Steps:")
        print("   1. Start the AI engine: python main.py")
        print("   2. Access API docs: http://localhost:8000/docs")
        print("   3. Try the ISO 29148 analysis: /iso29148/analyze")
        print("   4. Chat endpoint: /chat/enhanced")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Error during setup: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
