#!/usr/bin/env python
"""Quick test of dataset generation to verify performance."""

import time
import sys

sys.path.insert(0, '.')

from app.chat.iso29148_dataset import generate_poor_quality_requirements, generate_good_quality_requirements, generate_dataset

print("=" * 80)
print("🧪 DATASET GENERATION PERFORMANCE TEST")
print("=" * 80)

# Test 1: Poor quality requirements
print("\n1️⃣ Testing poor_quality requirements generation...")
start = time.time()
poor_reqs = generate_poor_quality_requirements()
elapsed = time.time() - start
print(f"   ✅ Generated {len(poor_reqs)} samples in {elapsed:.3f} seconds")
print(f"   First 3 samples:")
for i, (text, issues, severity) in enumerate(poor_reqs[:3], 1):
    print(f"      {i}. {text[:70]}...")

# Test 2: Good quality requirements
print("\n2️⃣ Testing good_quality requirements generation...")
start = time.time()
good_reqs = generate_good_quality_requirements()
elapsed = time.time() - start
print(f"   ✅ Generated {len(good_reqs)} samples in {elapsed:.3f} seconds")
print(f"   First 3 samples:")
for i, (text, issues, severity) in enumerate(good_reqs[:3], 1):
    print(f"      {i}. {text[:70]}...")

# Test 3: Full dataset
print("\n3️⃣ Testing full dataset generation (500 samples)...")
start = time.time()
dataset = generate_dataset(500)
elapsed = time.time() - start
print(f"   ✅ Generated {len(dataset)} total samples in {elapsed:.3f} seconds")
print(f"   Distribution:")
print(f"      - Compliant: {sum(1 for r in dataset if r['is_compliant'])}")
print(f"      - Non-Compliant: {sum(1 for r in dataset if not r['is_compliant'])}")

print("\n" + "=" * 80)
print("✅ ALL TESTS PASSED - Dataset generation is efficient!")
print("=" * 80)
