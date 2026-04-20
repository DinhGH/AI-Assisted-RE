"""
ISO 29148 Requirement Quality Classification Model.
Multi-class classifier for requirement quality dimensions.
"""

import json
import numpy as np
import pickle
from typing import Dict, List, Tuple
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, f1_score, 
    precision_score, recall_score, roc_auc_score, roc_curve
)
import pandas as pd


class RequirementQualityClassifier:
    """Classifies requirements by ISO 29148 quality dimensions."""
    
    def __init__(self, model_type: str = "random_forest"):
        """Initialize classifier with specified model type."""
        self.model_type = model_type
        self.vectorizer = None
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.label_encoder = {
            "compliant": 1,
            "non_compliant": 0
        }
        
    def _extract_features(self, text: str) -> Dict:
        """Extract handcrafted features for requirement analysis."""
        features = {}
        
        text_lower = text.lower()
        words = text_lower.split()
        
        # Length features
        features['char_count'] = len(text)
        features['word_count'] = len(words)
        features['avg_word_length'] = np.mean([len(w) for w in words]) if words else 0
        features['sentence_count'] = text.count('.') + text.count('!') + text.count('?')
        
        # ISO 29148 violation indicators
        high_risk_terms = [
            'should', 'must', 'may', 'can', 'might', 'could',
            'fast', 'slow', 'quick', 'efficient', 'easy', 'simple',
            'good', 'bad', 'nice', 'proper', 'appropriate', 'acceptable',
            'robust', 'reliable', 'stable', 'secure', 'safe',
            'hopefully', 'maybe', 'possibly', 'potentially', 'appears'
        ]
        
        features['ambiguous_term_count'] = sum(1 for term in high_risk_terms if term in text_lower)
        
        # Requirement keywords (ISO 29148 style)
        iso_keywords = ['shall', 'will', 'must', 'required', 'requirement']
        features['iso_keyword_count'] = sum(1 for kw in iso_keywords if kw in text_lower)
        
        # Measurable/specific indicators
        has_metrics = any(char.isdigit() for char in text)
        features['has_metrics'] = int(has_metrics)
        
        # Constraint/condition indicators
        has_condition = any(word in text_lower for word in ['when', 'if', 'where', 'unless', 'except'])
        features['has_conditions'] = int(has_condition)
        
        # Specificity indicators
        specific_terms = ['maximum', 'minimum', 'at least', 'no more', 'exactly', 'within']
        features['specificity_count'] = sum(1 for term in specific_terms if term in text_lower)
        
        # Actor/Object indicators  
        active_voice = sum(1 for word in ['system', 'application', 'user', 'admin', 'client', 'server'] 
                          if word in text_lower)
        features['actor_count'] = active_voice
        
        # Testability indicators
        testable_terms = ['verify', 'validate', 'check', 'assert', 'confirm', 'test']
        features['testable_terms_count'] = sum(1 for term in testable_terms if term in text_lower)
        
        # Punctuation diversity
        features['punctuation_diversity'] = len(set([c for c in text if not c.isalnum() and not c.isspace()]))
        
        # Completeness indicators (ACTOR-ACTION-OBJECT pattern)
        has_actor = any(word in text_lower for word in ['system', 'application', 'user', 'admin'])
        has_action = any(word in text_lower for word in ['shall', 'must', 'can', 'will', 'provide', 'support', 'handle'])
        has_object = any(word in text_lower for word in ['data', 'user', 'file', 'request', 'information', 'report'])
        features['aao_pattern_score'] = (int(has_actor) + int(has_action) + int(has_object)) / 3.0
        
        # Implementation independence (avoid technology-specific terms)
        tech_terms = ['sql', 'mongodb', 'javascript', 'python', 'java', 'c++', 'react', 'vue', 'angular']
        features['tech_term_count'] = sum(1 for term in tech_terms if term in text_lower)
        
        return features
    
    def prepare_data(self, dataset: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare dataset for training."""
        texts = []
        labels = []
        feature_matrices = []
        
        for item in dataset:
            texts.append(item['text'])
            labels.append(1 if item.get('is_compliant', False) else 0)
            features = self._extract_features(item['text'])
            feature_matrices.append(features)
        
        # Create feature dataframe
        feature_df = pd.DataFrame(feature_matrices)
        feature_matrix = feature_df.values
        
        # TF-IDF vectorization
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            lowercase=True,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.8
        )
        tfidf_matrix = self.vectorizer.fit_transform(texts).toarray()
        
        # Combine features
        combined_features = np.hstack([feature_matrix, tfidf_matrix])
        
        # Scale features
        combined_features = self.scaler.fit_transform(combined_features)
        
        return combined_features, np.array(labels)
    
    def train(self, dataset: List[Dict], test_size: float = 0.2):
        """Train the classifier."""
        print("🔄 Preparing dataset...")
        X, y = self.prepare_data(dataset)
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        print(f"📚 Training set: {len(X_train)}, Test set: {len(X_test)}")
        
        # Select model
        if self.model_type == "random_forest":
            print("🌲 Training Random Forest Classifier...")
            self.model = RandomForestClassifier(
                n_estimators=300,
                max_depth=20,
                min_samples_split=3,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
                class_weight='balanced_subsample'
            )
        elif self.model_type == "gradient_boosting":
            print("🚀 Training Gradient Boosting Classifier...")
            self.model = GradientBoostingClassifier(
                n_estimators=300,
                learning_rate=0.05,
                max_depth=7,
                min_samples_split=5,
                subsample=0.8,
                random_state=42
            )
        elif self.model_type == "svm":
            print("🎯 Training Support Vector Machine...")
            self.model = SVC(
                kernel='rbf',
                C=2.0,
                gamma='auto',
                probability=True,
                random_state=42
            )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        print("\n📊 Model Evaluation:")
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test) if hasattr(self.model, 'predict_proba') else None
        
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall: {recall:.3f}")
        print(f"  F1-Score: {f1:.3f}")
        
        if y_pred_proba is not None:
            auc = roc_auc_score(y_test, y_pred_proba[:, 1])
            print(f"  ROC-AUC: {auc:.3f}")
        
        print("\n  Classification Report:")
        print(classification_report(y_test, y_pred, target_names=['Non-Compliant', 'Compliant']))
        
        return {
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
    
    def predict(self, text: str) -> Dict:
        """Predict quality score and classification for a requirement."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Extract features
        features = self._extract_features(text)
        feature_list = [features[k] for k in sorted(features.keys())]
        
        # Vectorize text
        tfidf_vector = self.vectorizer.transform([text]).toarray()
        
        # Combine features
        combined = np.hstack([np.array(feature_list), tfidf_vector[0]])
        combined = self.scaler.transform([combined])
        
        # Predict
        prediction = self.model.predict(combined)[0]
        probabilities = self.model.predict_proba(combined)[0] if hasattr(self.model, 'predict_proba') else None
        
        return {
            'is_compliant': bool(prediction),
            'compliance_probability': float(probabilities[1]) if probabilities is not None else None,
            'non_compliance_probability': float(probabilities[0]) if probabilities is not None else None,
            'quality_indicators': features
        }
    
    def save(self, filepath: str):
        """Save trained model."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'vectorizer': self.vectorizer,
                'scaler': self.scaler,
                'model_type': self.model_type
            }, f)
        print(f"✓ Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load trained model."""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        self.model = data['model']
        self.vectorizer = data['vectorizer']
        self.scaler = data['scaler']
        self.model_type = data['model_type']
        print(f"✓ Model loaded from {filepath}")


class MultiDimensionalQualityClassifier:
    """Classifies requirements across multiple ISO 29148 dimensions."""
    
    def __init__(self):
        """Initialize multi-dimensional classifier."""
        self.classifiers = {
            'ambiguity': RequirementQualityClassifier(),
            'verifiability': RequirementQualityClassifier(),
            'completeness': RequirementQualityClassifier(),
            'consistency': RequirementQualityClassifier(),
            'feasibility': RequirementQualityClassifier()
        }
    
    def train_multi_dimensional(self, dataset: List[Dict]):
        """Train classifiers for each ISO 29148 dimension."""
        # This would require multi-label dataset preparation
        # For now, train using the main classifier approach
        for dimension_name, classifier in self.classifiers.items():
            print(f"\n🎯 Training {dimension_name} classifier...")
            classifier.train(dataset)
    
    def predict_dimensions(self, text: str) -> Dict:
        """Predict quality across all dimensions."""
        results = {}
        for dimension_name, classifier in self.classifiers.items():
            results[dimension_name] = classifier.predict(text)
        
        # Calculate overall score
        scores = [r.get('compliance_probability', 0.5) for r in results.values()]
        overall_score = np.mean(scores) if scores else 0.5
        
        return {
            'text': text,
            'dimensions': results,
            'overall_compliance_score': overall_score,
            'is_compliant': overall_score > 0.6
        }


if __name__ == "__main__":
    # Example usage
    from app.chat.iso29148_dataset import generate_dataset
    
    print("📦 Loading dataset...")
    dataset = generate_dataset(500)
    
    print("\n🤖 Training classifier...")
    classifier = RequirementQualityClassifier(model_type="gradient_boosting")
    metrics = classifier.train(dataset)
    
    # Save model
    classifier.save("models/requirement_quality_classifier.pkl")
    
    # Test predictions
    print("\n🧪 Testing predictions:")
    test_requirements = [
        "The system should be fast",
        "The system shall authenticate users via OAuth 2.0 with session timeout of 30 minutes",
        "The application must be easy to use",
        "The API shall return JSON responses within 500ms (p99) under peak load of 5000 RPS"
    ]
    
    for req in test_requirements:
        result = classifier.predict(req)
        print(f"\n📝 Requirement: {req[:60]}...")
        print(f"✅ Compliant: {result['is_compliant']}")
        print(f"📊 Confidence: {result['compliance_probability']:.2%}")
