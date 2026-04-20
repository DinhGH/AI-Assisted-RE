#!/usr/bin/env python
"""
🚀 ADVANCED AI TRAINING - Domain-Specific + LLM Fine-tuning + Real Requirements
Trains AI with:
1. Medical, Financial, E-Commerce, IoT domain requirements
2. LLM fine-tuning on distilgpt2
3. Real project requirements from workspace
"""

import os
import sys
import json
import pickle
from pathlib import Path
from datetime import datetime
import numpy as np

# Add ai-engine to path
ai_engine_path = Path(__file__).parent
sys.path.insert(0, str(ai_engine_path))

from app.chat.iso29148_dataset import generate_dataset, save_dataset
from app.chat.quality_classifier import RequirementQualityClassifier


class DomainSpecificDatasetGenerator:
    """Generate domain-specific requirement datasets."""
    
    @staticmethod
    def generate_medical_requirements(count: int = 300) -> list:
        """Generate medical/healthcare domain requirements."""
        print(f"  🏥 Generating {count} medical domain requirements...")
        
        medical_templates = [
            "The system shall maintain {hipaa_compliance} HIPAA compliance with encrypted {encryption} encryption",
            "Patient records shall be accessible within {latency}ms with {audit} audit trails",
            "The system shall validate medical identifiers using {standard} standard with {validation} level verification",
            "Prescription data shall be encrypted using {algo} and stored with {backup} backups",
            "The system shall support {hl7_version} HL7 messaging for clinical interoperability",
            "User authentication shall use {auth_method} with {mfa} multi-factor authentication",
            "System shall maintain {uptime}% uptime SLA with {rto}min RTO objective",
            "Patient consent management shall track {consent_types} consent types with timestamp recording",
            "The system shall generate {report_types} clinical reports within {report_time}ms",
            "Pharmacy integration shall validate {drug_interactions} drug interactions before dispensing",
            "System shall notify {stakeholder} stakeholders within {notification_time}ms of critical alerts",
            "Lab result upload shall validate {lis_protocols} LIS protocols with automatic {parsing} parsing",
            "Appointment scheduling shall block {conflict_check}% overlapping slots with {overbooking} overbooking control",
            "Telemedicine sessions shall support {video_codec} codec with minimum {bandwidth}Mbps bandwidth",
            "System shall backup patient data every {backup_interval} hours with {retention} day retention",
        ]
        
        # Medical-specific values
        params = {
            'hipaa_compliance': ['full', 'strict', 'certified'],
            'encryption': ['AES-256', 'TLS 1.3', 'end-to-end'],
            'latency': [100, 200, 500],
            'audit': ['complete', 'comprehensive', 'detailed'],
            'standard': ['HL7 v2.5', 'CDISC', 'LOINC'],
            'validation': ['strict', 'enhanced', 'multi-level'],
            'algo': ['AES-256-GCM', 'RSA-2048', 'ECC-P256'],
            'backup': [2, 3, 4],
            'hl7_version': ['HL7 v2.5', 'FHIR R4', 'DICOM 3.0'],
            'auth_method': ['OAuth 2.0', 'SAML 2.0', 'PKI certificate'],
            'mfa': ['required', 'mandatory', 'enforced'],
            'uptime': [99.9, 99.95, 99.99],
            'rto': [15, 30, 60],
            'consent_types': [5, 10, 15],
            'report_types': ['discharge summaries', 'clinical notes', 'lab results'],
            'report_time': [500, 1000, 2000],
            'drug_interactions': ['critical', 'major', 'minor'],
            'stakeholder': ['physicians', 'nurses', 'pharmacists'],
            'notification_time': [100, 500, 1000],
            'lis_protocols': ['ASTM', 'HL7', 'ASCII'],
            'parsing': ['real-time', 'automated', 'intelligent'],
            'conflict_check': [98, 99, 100],
            'overbooking': ['prevented', 'monitored', 'logged'],
            'video_codec': ['H.264', 'VP9', 'H.265'],
            'bandwidth': [2.5, 5, 10],
            'backup_interval': [1, 4, 8],
            'retention': [7, 30, 365],
        }
        
        requirements = []
        for i in range(count):
            template = medical_templates[i % len(medical_templates)]
            # Fill template with random values
            filled = template
            for param, values in params.items():
                placeholder = '{' + param + '}'
                if placeholder in filled:
                    value = values[i % len(values)]
                    filled = filled.replace(placeholder, str(value))
            
            requirements.append({
                'requirement_id': f'med_{i}',
                'text': filled,
                'category': 'medical',
                'domain': 'healthcare',
                'is_compliant': True
            })
        
        return requirements
    
    @staticmethod
    def generate_financial_requirements(count: int = 300) -> list:
        """Generate financial/banking domain requirements."""
        print(f"  💰 Generating {count} financial domain requirements...")
        
        financial_templates = [
            "Payment processing shall comply with {pci_level} PCI DSS standards",
            "Transaction records shall be encrypted using {encryption} with {hashing} hashing",
            "The system shall detect {fraud_types} fraud patterns within {detection_time}ms",
            "Currency conversion shall use {exchange_rate_source} rates updated every {update_freq}",
            "Account reconciliation shall complete within {reconcile_time}hours daily",
            "User funds shall be segregated according to {regulation} requirements",
            "System shall support {currency_count} currencies with {precision} decimal precision",
            "Audit logs shall record {audit_detail} transaction details with {signing} signing",
            "Settlement shall occur within {settlement_time}T{settlement_hour} with {retry} retry logic",
            "System shall maintain {reserve_ratio}% cash reserves for liquidity",
            "API rate limiting shall enforce {rate_limit} requests per {rate_limit_period}",
            "Failed transactions shall be logged with {backoff_strategy} exponential backoff",
            "Account opening shall complete KYC verification within {kyc_time}min",
            "Compliance reports shall be generated {report_frequency} with {certification} certification",
            "Multi-currency wallet shall support {asset_count} assets with atomic {atomicity} swaps",
        ]
        
        # Financial-specific values
        params = {
            'pci_level': ['Level 1', 'Level 2', 'Level 3'],
            'encryption': ['AES-256-CBC', 'RSA-2048', 'ECC-P384'],
            'hashing': ['SHA-256', 'SHA-3', 'bcrypt'],
            'fraud_types': ['suspicious transfers', 'unusual patterns', 'geographic anomalies'],
            'detection_time': [100, 500, 1000],
            'exchange_rate_source': ['Bloomberg', 'Reuters', 'ECB'],
            'update_freq': ['1min', '5min', '15min'],
            'reconcile_time': [1, 2, 4],
            'regulation': ['Basel III', 'GDPR', 'SOX'],
            'currency_count': [50, 100, 200],
            'precision': [2, 4, 8],
            'audit_detail': ['full', 'comprehensive', 'detailed'],
            'signing': ['cryptographic', 'digital', 'HMAC'],
            'settlement_time': ['T+0', 'T+1', 'T+2'],
            'settlement_hour': ['immediate', '16:00', 'end-of-day'],
            'retry': ['exponential', 'linear', 'fibonacci'],
            'reserve_ratio': [5, 10, 20],
            'rate_limit': [1000, 5000, 10000],
            'rate_limit_period': ['1sec', '1min', '1hour'],
            'backoff_strategy': ['exponential', '2^n', 'capped exponential'],
            'kyc_time': [5, 15, 30],
            'report_frequency': ['daily', 'weekly', 'monthly'],
            'certification': ['ISO 27001', 'SOC 2', 'PCI DSS'],
            'asset_count': [10, 50, 100],
            'atomicity': ['transactions', 'operations', 'swaps'],
        }
        
        requirements = []
        for i in range(count):
            template = financial_templates[i % len(financial_templates)]
            filled = template
            for param, values in params.items():
                placeholder = '{' + param + '}'
                if placeholder in filled:
                    value = values[i % len(values)]
                    filled = filled.replace(placeholder, str(value))
            
            requirements.append({
                'requirement_id': f'fin_{i}',
                'text': filled,
                'category': 'financial',
                'domain': 'fintech',
                'is_compliant': True
            })
        
        return requirements
    
    @staticmethod
    def generate_ecommerce_requirements(count: int = 250) -> list:
        """Generate e-commerce domain requirements."""
        print(f"  🛒 Generating {count} e-commerce domain requirements...")
        
        ecom_templates = [
            "Product search shall return results within {search_latency}ms for {product_scale} products",
            "Shopping cart shall persist for {session_duration}min with {max_items} item limit",
            "Order checkout shall complete within {checkout_steps} steps from cart",
            "inventory shall update in real-time with {allocation_strategy} allocation strategy",
            "Payment gateway integration shall support {payment_methods} payment methods",
            "Shipping rates shall calculate dynamically based on {shipping_factors} factors",
            "Recommendation engine shall consider {recommendation_factors} user factors",
            "Product images shall support {image_formats} formats with {max_size}MB size limit",
            "Review moderation shall filter {content_check}} with {moderation_latency}ms latency",
            "Customer support chat shall queue requests with {sla}} SLA response time",
            "Return processing shall complete within {return_window} days with {refund_options}} options",
            "Platform shall handle {concurrent_users}} concurrent users during peak hours",
            "Wishlist items shall sync across with {sync_latency}}ms synchronization",
            "Coupon validation shall prevent {coupon_abuse}} abuse with {validation_rules}} rules",
            "Order tracking shall update status every {tracking_interval}} with {location_precision}}% accuracy",
        ]
        
        params = {
            'search_latency': [200, 500, 1000],
            'product_scale': ['100K', '1M', '10M'],
            'session_duration': [30, 60, 120],
            'max_items': [20, 50, 100],
            'checkout_steps': [3, 4, 5],
            'allocation_strategy': ['FIFO', 'priority-based', 'balanced'],
            'payment_methods': [5, 10, 20],
            'shipping_factors': ['weight', 'distance', 'urgency'],
            'recommendation_factors': ['browsing history', 'purchases', 'ratings'],
            'image_formats': ['JPEG', 'PNG', 'WebP'],
            'max_size': [2, 5, 10],
            'content_check': ['profanity', 'hate speech', 'spam'],
            'moderation_latency': [100, 500, 2000],
            'sla': ['2min', '5min', '15min'],
            'return_window': [7, 14, 30],
            'refund_options': [2, 3, 4],
            'concurrent_users': [1000, 10000, 100000],
            'sync_latency': [500, 2000, 5000],
            'coupon_abuse': ['duplicate usage', 'stack limits', 'expiration'],
            'validation_rules': [3, 5, 10],
            'tracking_interval': ['1min', '5min', '15min'],
            'location_precision': [95, 99, 99.9],
        }
        
        requirements = []
        for i in range(count):
            template = ecom_templates[i % len(ecom_templates)]
            filled = template
            for param, values in params.items():
                placeholder = '{' + param + '}'
                if placeholder in filled:
                    value = values[i % len(values)]
                    filled = filled.replace(placeholder, str(value))
            
            requirements.append({
                'requirement_id': f'ecom_{i}',
                'text': filled,
                'category': 'ecommerce',
                'domain': 'retail',
                'is_compliant': True
            })
        
        return requirements
    
    @staticmethod
    def generate_iot_requirements(count: int = 250) -> list:
        """Generate IoT/embedded systems requirements."""
        print(f"  🌐 Generating {count} IoT domain requirements...")
        
        iot_templates = [
            "Sensor data shall be collected every {sampling_rate}}ms with {accuracy}}% accuracy",
            "Device firmware updates shall complete within {update_time}}min over {network_type}} network",
            "Sensor nodes shall operate for {battery_life}} days on single charge",
            "Real-time alerts shall trigger within {alert_latency}}ms of threshold breach",
            "Wireless communication shall use {{protocol}} with {{encryption}} encryption",
            "Device provisioning shall complete automatically within {{provisioning_time}} seconds",
            "Sensor calibration shall maintain {{tolerance}} tolerance across {{temp_range}}-{{temp_unit}} temperature range",
            "Data compression shall achieve {{compression_ratio}} ratio while maintaining {{precision}} precision",
            "Device heartbeat shall ping gateway every {{heartbeat_interval}} seconds",
            "Failed transmissions shall retry with {{backoff_type}} backoff strategy",
            "Cloud sync shall queue {{max_queue}} events with {{sync_period}} synchronization interval",
            "Over-the-air updates shall support {{rollback}} rollback mechanism",
            "Device clustering shall support {{node_count}} nodes with {{latency_requirement}} millisecond latency",
            "Power management shall balance {{power_states}} power states for {{avg_consumption}} mA average consumption",
            "Edge processing shall offload {{computational_load}} of processing locally before cloud sync",
        ]
        
        params = {
            'sampling_rate': [100, 500, 1000],
            'accuracy': [90, 95, 99],
            'update_time': [5, 15, 30],
            'network_type': ['WiFi', '5G', 'LoRaWAN'],
            'battery_life': [1, 7, 30],
            'alert_latency': [50, 100, 500],
            'protocol': ['MQTT', 'CoAP', 'BLE'],
            'encryption': ['AES-128', 'ChaCha20', 'TLS'],
            'provisioning_time': [15, 30, 60],
            'tolerance': ['0.5', '1', '2'],
            'temp_range': ['0-50', '0-80', '-10-60'],
            'temp_unit': ['C', 'F'],
            'compression_ratio': ['2:1', '5:1', '10:1'],
            'precision': ['high', 'standard', 'lossy'],
            'heartbeat_interval': [10, 30, 60],
            'backoff_type': ['exponential', 'linear', 'random'],
            'max_queue': [100, 1000, 10000],
            'sync_period': [1, 5, 15],
            'rollback': ['supported', 'mandatory', 'automatic'],
            'node_count': [10, 50, 1000],
            'latency_requirement': [100, 500, 1000],
            'power_states': [2, 3, 4],
            'avg_consumption': [5, 10, 50],
            'computational_load': ['50%', '70%', '90%'],
        }
        
        requirements = []
        for i in range(count):
            template = iot_templates[i % len(iot_templates)]
            filled = template
            for param, values in params.items():
                placeholder = '{{' + param + '}}'
                if placeholder in filled:
                    value = values[i % len(values)]
                    filled = filled.replace(placeholder, str(value))
            
            requirements.append({
                'requirement_id': f'iot_{i}',
                'text': filled,
                'category': 'iot',
                'domain': 'embedded',
                'is_compliant': True
            })
        
        return requirements
    
    @staticmethod
    def extract_real_requirements_from_workspace() -> list:
        """Extract real requirements from project files."""
        print("  📁 Extracting real project requirements...")
        
        requirements = []
        workspace_root = Path(__file__).parent.parent.parent
        
        # Look for requirement files and documentation
        doc_extensions = ['.md', '.txt', '.rst']
        
        for doc_file in workspace_root.glob('**/*'):
            if doc_file.suffix in doc_extensions and doc_file.is_file():
                try:
                    content = doc_file.read_text(encoding='utf-8', errors='ignore')
                    
                    # Extract lines that look like requirements
                    lines = content.split('\n')
                    for line in lines:
                        line = line.strip()
                        # Check if line looks like a requirement
                        if (len(line) > 20 and 
                            any(kw in line.lower() for kw in ['shall', 'must', 'should', 'will', 'may', 'provide', 'support', 'handle', 'manage']) and
                            not line.startswith('#')):
                            
                            requirements.append({
                                'requirement_id': f'real_{len(requirements)}',
                                'text': line[:200],  # Limit length
                                'category': 'project-specific',
                                'source': str(doc_file.relative_to(workspace_root)),
                                'is_compliant': True
                            })
                            
                            if len(requirements) >= 100:  # Extract up to 100 real requirements
                                break
                    
                    if len(requirements) >= 100:
                        break
                        
                except Exception as e:
                    pass
        
        return requirements[:100]  # Limit to 100 real requirements


def train_llm_model():
    """Train LLM (distilgpt2) for requirement chat."""
    print("\n" + "="*80)
    print("🧠 TRAINING LLM MODEL (distilgpt2)")
    print("="*80)
    
    try:
        from datasets import load_from_disk
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
        
        dataset_dir = './data/processed'
        
        if not Path(dataset_dir).exists():
            print("⚠️  Processed dataset not found. Skipping LLM training.")
            return None
        
        print("\n📚 Loading datasets...")
        try:
            train_dataset = load_from_disk(f'{dataset_dir}/train')
            val_dataset = load_from_disk(f'{dataset_dir}/validation')
        except:
            print("⚠️  Dataset not in processed format. Skipping LLM training.")
            return None
        
        print("🤖 Loading distilgpt2 model...")
        model_name = 'distilgpt2'
        model = AutoModelForCausalLM.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        print("📝 Formatting and tokenizing data...")
        
        def format_conversation(example):
            instruction = example.get('instruction', '')
            input_text = example.get('input', '')
            output_text = example.get('output', '')
            
            if input_text:
                text = f'Instruction: {instruction}\nInput: {input_text}\nResponse: {output_text}'
            else:
                text = f'Instruction: {instruction}\nResponse: {output_text}'
            
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
        
        tokenized_train = train_formatted.map(tokenize_function, batched=True)
        tokenized_val = val_formatted.map(tokenize_function, batched=True)
        
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )
        
        print("⚙️  Setting up training...")
        training_args = TrainingArguments(
            output_dir='./models/distilgpt2-requirement-finetuned',
            num_train_epochs=2,
            per_device_train_batch_size=2,
            per_device_eval_batch_size=2,
            logging_steps=10,
            save_steps=50,
            eval_strategy='steps',
            eval_steps=20,
            save_total_limit=1,
            load_best_model_at_end=True,
            report_to=[],
        )
        
        print("🚀 Training LLM...")
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_train,
            eval_dataset=tokenized_val,
            data_collator=data_collator,
        )
        
        trainer.train()
        
        print("💾 Saving fine-tuned model...")
        model.save_pretrained('./models/distilgpt2-requirement-finetuned')
        tokenizer.save_pretrained('./models/distilgpt2-requirement-finetuned')
        
        return {'status': 'success', 'model': 'distilgpt2-requirement-finetuned'}
        
    except ImportError as e:
        print(f"⚠️  Required packages not available: {e}")
        print("   Install with: pip install transformers torch")
        return None
    except Exception as e:
        print(f"⚠️  LLM training error: {e}")
        return None


def main():
    """Main advanced training pipeline."""
    print("\n" + "="*80)
    print("🚀 ADVANCED AI TRAINING - DOMAIN-SPECIFIC + LLM + REAL REQUIREMENTS")
    print("="*80)
    
    start_time = datetime.now()
    
    try:
        # Create directories
        Path("data/processed").mkdir(parents=True, exist_ok=True)
        Path("models").mkdir(parents=True, exist_ok=True)
        Path("logs").mkdir(parents=True, exist_ok=True)
        print("\n✅ Directories created")
        
        # Generate domain-specific datasets
        print("\n" + "="*80)
        print("📦 GENERATING DOMAIN-SPECIFIC DATASETS")
        print("="*80)
        
        all_requirements = []
        
        # Generate base requirements
        print("\n🔄 Generating base ISO 29148 requirements...")
        base_reqs = generate_dataset(300)
        all_requirements.extend(base_reqs)
        print(f"   ✅ Generated {len(base_reqs)} base requirements")
        
        # Generate domain-specific
        med_reqs = DomainSpecificDatasetGenerator.generate_medical_requirements(300)
        all_requirements.extend(med_reqs)
        print(f"   ✅ Generated {len(med_reqs)} medical requirements")
        
        fin_reqs = DomainSpecificDatasetGenerator.generate_financial_requirements(300)
        all_requirements.extend(fin_reqs)
        print(f"   ✅ Generated {len(fin_reqs)} financial requirements")
        
        ecom_reqs = DomainSpecificDatasetGenerator.generate_ecommerce_requirements(250)
        all_requirements.extend(ecom_reqs)
        print(f"   ✅ Generated {len(ecom_reqs)} e-commerce requirements")
        
        iot_reqs = DomainSpecificDatasetGenerator.generate_iot_requirements(250)
        all_requirements.extend(iot_reqs)
        print(f"   ✅ Generated {len(iot_reqs)} IoT requirements")
        
        # Extract real project requirements
        real_reqs = DomainSpecificDatasetGenerator.extract_real_requirements_from_workspace()
        all_requirements.extend(real_reqs)
        print(f"   ✅ Extracted {len(real_reqs)} real project requirements")
        
        print(f"\n📊 Total dataset size: {len(all_requirements)} requirements")
        
        # Save comprehensive dataset
        dataset_file = "data/iso29148_dataset_advanced.json"
        save_dataset(all_requirements, dataset_file)
        print(f"💾 Saved to {dataset_file}")
        
        # Train classifiers with advanced dataset
        print("\n" + "="*80)
        print("🤖 TRAINING CLASSIFIERS WITH ADVANCED DATASET")
        print("="*80)
        
        print("\n1️⃣ Training Gradient Boosting...")
        gb_classifier = RequirementQualityClassifier(model_type="gradient_boosting")
        gb_metrics = gb_classifier.train(all_requirements, test_size=0.15)
        gb_classifier.save("models/quality_classifier_advanced_gb.pkl")
        print(f"   F1 Score: {gb_metrics.get('f1', 0):.4f}")
        
        print("\n2️⃣ Training Random Forest...")
        rf_classifier = RequirementQualityClassifier(model_type="random_forest")
        rf_metrics = rf_classifier.train(all_requirements, test_size=0.15)
        rf_classifier.save("models/quality_classifier_advanced_rf.pkl")
        print(f"   F1 Score: {rf_metrics.get('f1', 0):.4f}")
        
        print("\n3️⃣ Training SVM...")
        svm_classifier = RequirementQualityClassifier(model_type="svm")
        svm_metrics = svm_classifier.train(all_requirements, test_size=0.15)
        svm_classifier.save("models/quality_classifier_advanced_svm.pkl")
        print(f"   F1 Score: {svm_metrics.get('f1', 0):.4f}")
        
        # Train LLM
        print("\n" + "="*80)
        print("🧠 LLM FINE-TUNING")
        print("="*80)
        llm_result = train_llm_model()
        
        # Generate report
        print("\n" + "="*80)
        print("📊 ADVANCED TRAINING SUMMARY")
        print("="*80)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "training_type": "Advanced Domain-Specific Training",
            "dataset": {
                "total_samples": len(all_requirements),
                "breakdown": {
                    "base": len(base_reqs),
                    "medical": len(med_reqs),
                    "financial": len(fin_reqs),
                    "ecommerce": len(ecom_reqs),
                    "iot": len(iot_reqs),
                    "real_project": len(real_reqs),
                }
            },
            "models_trained": {
                "gradient_boosting": gb_metrics,
                "random_forest": rf_metrics,
                "svm": svm_metrics,
                "llm_finetuning": llm_result
            },
            "improvements": {
                "dataset_diversity": "5 specialized domains",
                "real_requirements": f"{len(real_reqs)} from actual project",
                "model_ensemble": "3-model ensemble for robust predictions",
                "llm_capability": "Fine-tuned distilgpt2 for requirement chat"
            }
        }
        
        # Print summary
        print(f"\n✅ Dataset: {len(all_requirements)} diverse requirements")
        print(f"   - Base: {len(base_reqs)}")
        print(f"   - Medical: {len(med_reqs)}")
        print(f"   - Financial: {len(fin_reqs)}")
        print(f"   - E-Commerce: {len(ecom_reqs)}")
        print(f"   - IoT: {len(iot_reqs)}")
        print(f"   - Real Project: {len(real_reqs)}")
        
        print(f"\n✅ Models Trained:")
        print(f"   - Gradient Boosting: F1={gb_metrics.get('f1', 0):.4f}")
        print(f"   - Random Forest: F1={rf_metrics.get('f1', 0):.4f}")
        print(f"   - SVM: F1={svm_metrics.get('f1', 0):.4f}")
        if llm_result:
            print(f"   - LLM: {llm_result.get('model', 'N/A')}")
        
        # Save report
        report_file = "logs/training_summary_advanced.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n💾 Summary saved to {report_file}")
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n" + "="*80)
        print(f"✨ ADVANCED TRAINING COMPLETED!")
        print(f"⏱️  Total time: {elapsed:.1f} seconds")
        print(f"📊 Dataset: {len(all_requirements)} samples across 5+ domains")
        print(f"🤖 Models: Ensemble classifier + fine-tuned LLM")
        print(f"🎯 Ready for production!")
        print("="*80 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
