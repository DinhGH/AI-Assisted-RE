"""
Generate ISO/IEC/IEEE 29148:2018 compliant requirement dataset.
Includes 500+ samples with quality scores and classifications.
"""

import json
import random
from typing import Dict, List, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict


@dataclass
class ISO29148Requirement:
    """ISO 29148 compliant requirement with quality metrics."""
    requirement_id: str
    text: str
    quality_score: float  # 0-100
    issues: List[str]  # ambiguity, incompleteness, inconsistency, etc.
    severity_level: str  # critical, major, minor
    category: str  # functional, performance, security, usability, reliability
    improvement_suggestion: str
    iso_violations: List[str]  # unambiguous, verifiable, consistent, complete, feasible
    

# ISO 29148 Quality Dimensions
QUALITY_DIMENSIONS = [
    "unambiguous",
    "verifiable", 
    "consistent",
    "complete",
    "feasible",
    "implementation_independent",
    "traceable"
]

# Requirement Categories
CATEGORIES = {
    "functional": "What the system shall do",
    "performance": "Response time, throughput, capacity",
    "security": "Protection of data and system access",
    "usability": "User interaction and learning",
    "reliability": "Availability and fault tolerance",
    "scalability": "Handling growth and load",
    "maintainability": "Ease of maintenance and updates"
}

# Common ambiguous terms (anti-patterns)
AMBIGUOUS_TERMS = [
    "fast", "slow", "quick", "efficient", "responsive",
    "easy", "simple", "intuitive", "user-friendly", "convenient",
    "robust", "reliable", "stable", "secure", "safe",
    "good", "bad", "nice", "proper", "appropriate",
    "many", "few", "large", "small", "sufficient",
    "hopefully", "maybe", "possibly", "potentially", "appears"
]

# ISO violations patterns
ISO_VIOLATION_PATTERNS = {
    "ambiguity": [
        "The system should be fast",
        "The application must be easy to use",
        "Users should be able to manage data",
        "The system must handle errors gracefully",
        "The product must provide a good user experience"
    ],
    "incompleteness": [
        "The system shall validate input",
        "The API must return data",
        "Users can search for information",
        "The system processes transactions",
        "Notifications are sent to users"
    ],
    "inconsistency": [
        "The system shall be available 99.99% uptime and only experience brief outages",
        "Support both modern and legacy browsers with identical UI",
        "Require strong password AND allow simple passwords",
        "Process payments faster than competitors AND cheaper than competitors"
    ],
    "non_verifiable": [
        "The system should be user-friendly",
        "The application must provide excellent performance",
        "Users shall have seamless experience",
        "The system should minimize latency",
        "Data shall be properly secured"
    ],
    "non_feasible": [
        "The system shall respond in 0 milliseconds",
        "The application must work without any bugs",
        "All users shall be simultaneously connected",
        "100% uptime without maintenance windows"
    ]
}

# High-quality requirement patterns
HIGH_QUALITY_PATTERNS = {
    "functional": [
        "The system shall authenticate users via username and password",
        "The application shall encrypt sensitive data using AES-256",
        "Users shall be able to export reports in PDF, CSV, and Excel formats",
        "The system shall validate email addresses before user registration",
        "The platform shall support role-based access control (RBAC) with 5 predefined roles"
    ],
    "performance": [
        "The system shall return search results within 2 seconds (p95) for datasets up to 1 million records",
        "API endpoints shall process requests at a minimum throughput of 1000 RPS under normal load",
        "Page load time shall not exceed 3 seconds on broadband connections (3+ Mbps)",
        "Database queries shall complete in under 500ms for standard analytics reports",
        "The system shall support concurrent connections from up to 10,000 simultaneous users"
    ],
    "security": [
        "The system shall enforce HTTPS for all external communications using TLS 1.3",
        "User passwords shall be hashed using bcrypt with minimum cost factor of 12",
        "The system shall implement rate limiting of 100 requests per minute per IP address",
        "All database access shall require multi-factor authentication for privileged operations",
        "The system shall log all security events and retain logs for 90 days"
    ],
    "usability": [
        "The user interface shall follow WCAG 2.1 AA accessibility standards",
        "Users shall complete primary tasks with a maximum of 3 clicks from the home page",
        "The system shall provide real-time validation feedback with clear error messages",
        "Mobile interface shall be fully functional on devices with minimum screen width of 320px",
        "Users shall be able to customize dashboard layout with drag-and-drop functionality"
    ],
    "reliability": [
        "The system shall be available 99.9% uptime annually, excluding scheduled maintenance",
        "Average time between failures (MTBF) shall be at least 720 hours",
        "Mean time to recovery (MTTR) shall not exceed 30 minutes for critical system failures",
        "The system shall automatically restart services after unexpected failures",
        "Backup procedures shall complete successfully 100% of the time with zero data loss"
    ],
    "scalability": [
        "The system architecture shall support horizontal scaling to handle 10x current user load",
        "Database design shall support partitioning to handle 100 million records",
        "The system shall maintain response times within specified limits when user load doubles",
        "Cloud resources shall auto-scale based on CPU utilization thresholds of 70%"
    ],
    "maintainability": [
        "Code shall follow PEP 8 style guide with maximum cyclomatic complexity of 5",
        "All functions shall have docstrings documenting parameters and return values",
        "Test coverage shall exceed 80% for critical business logic",
        "Database schema changes shall be tracked with version control and migration scripts",
        "System architecture documentation shall be updated within 2 weeks of any major changes"
    ]
}

# Improvement suggestions by issue type
IMPROVEMENT_SUGGESTIONS = {
    "ambiguity": "Replace ambiguous term with specific metrics: 'fast' → 'within X seconds', 'easy' → 'accomplishable in N steps'",
    "incompleteness": "Add scope, conditions, and acceptance criteria. Include: What triggers it? What are the success conditions?",
    "inconsistency": "Clarify conflicting statements. Define exceptions, constraints, and boundary conditions explicitly.",
    "non_verifiable": "Add measurable metrics, units, thresholds, and testable acceptance criteria with clear pass/fail conditions.",
    "non_feasible": "Review technical constraints. Consult with development team to establish realistic targets.",
    "implementation_dependent": "Focus on WHAT is needed, not HOW to implement. Remove technology-specific details.",
    "missing_traceability": "Add requirement ID, link to stakeholder needs, and trace to design specifications."
}


def _build_random_text(template: str, variables: Dict[str, List[str]]) -> str:
    return template.format(**{k: random.choice(v) for k, v in variables.items()})


def _generate_unique_requirements(templates: List[Dict], count: int) -> List[Tuple[str, List[str], str]]:
    """Generate unique requirements by systematically iterating through template variables."""
    unique_texts = set()
    results = []
    
    # Expand all templates into combinations first
    all_combinations = []
    for item in templates:
        template = item["template"]
        variables = item["variables"]
        
        # Get all variable combinations for this template
        var_names = list(variables.keys())
        var_lists = [variables[name] for name in var_names]
        
        # Generate all combinations from this template
        from itertools import product
        for combo in product(*var_lists):
            var_dict = {var_names[i]: [combo[i]] for i in range(len(var_names))}
            text = _build_random_text(template, var_dict)
            all_combinations.append((text, item["issues"], item["severity"]))
    
    # Shuffle and deduplicate
    random.shuffle(all_combinations)
    for text, issues, severity in all_combinations:
        if text.lower().strip() not in unique_texts and len(results) < count:
            unique_texts.add(text.lower().strip())
            results.append((text, issues, severity))
    
    # If we don't have enough combinations, generate additional random ones
    attempt = 0
    max_attempts = 1000
    while len(results) < count and attempt < max_attempts:
        item = random.choice(templates)
        text = _build_random_text(item["template"], item["variables"])
        if text.lower().strip() not in unique_texts:
            unique_texts.add(text.lower().strip())
            results.append((text, item["issues"], item["severity"]))
        attempt += 1
    
    return results[:count]


def generate_poor_quality_requirements() -> List[Tuple[str, List[str], str]]:
    """Generate poor quality requirements with parametric variation."""
    templates = [
        {
            "template": "The {actor} should be {quality}",
            "variables": {
                "actor": ["system", "application", "platform", "tool", "module"],
                "quality": ["fast", "easy", "robust", "simple", "efficient", "smooth"]
            },
            "issues": ["ambiguity"],
            "severity": "major"
        },
        {
            "template": "The {actor} shall handle {event}",
            "variables": {
                "actor": ["system", "app", "service", "platform"],
                "event": ["errors", "failures", "exceptions", "issues", "problems"]
            },
            "issues": ["incomplete"],
            "severity": "major"
        },
        {
            "template": "{actor} returns {obj}",
            "variables": {
                "actor": ["The API", "System", "Service", "The application"],
                "obj": ["data", "results", "information", "response", "output"]
            },
            "issues": ["incomplete", "ambiguity"],
            "severity": "major"
        },
        {
            "template": "{actor} must be {quality}",
            "variables": {
                "actor": ["The system", "The application", "Users", "The platform"],
                "quality": ["reliable", "secure", "available", "responsive", "scalable"]
            },
            "issues": ["non_verifiable"],
            "severity": "major"
        },
        {
            "template": "{action} {obj} operations in {time}",
            "variables": {
                "action": ["Support", "Handle", "Process", "Execute"],
                "obj": ["database", "file", "transaction", "request"],
                "time": ["seconds", "minutes", "real-time", "quickly"]
            },
            "issues": ["ambiguity", "non_verifiable"],
            "severity": "major"
        },
    ]
    return _generate_unique_requirements(templates, 150)


def generate_good_quality_requirements() -> List[Tuple[str, List[str], str]]:
    """Generate high quality ISO 29148 compliant requirements."""
    good_requirements = []
    
    for category, patterns in HIGH_QUALITY_PATTERNS.items():
        for pattern in patterns:
            good_requirements.append((pattern, [], "minor"))
    
    return good_requirements


def generate_dataset(total_samples: int = 500) -> List[Dict]:
    """Generate complete ISO 29148 dataset with unique samples."""
    dataset = []
    req_id = 1
    seen_texts = set()
    
    poor_reqs = generate_poor_quality_requirements()
    good_reqs = generate_good_quality_requirements()
    
    # Calculate distribution
    poor_count = int(total_samples * 0.4)
    good_count = int(total_samples * 0.35)
    intermediate_count = total_samples - poor_count - good_count
    
    # Add poor quality requirements
    for text, issues, severity in poor_reqs[:poor_count]:
        if text.lower().strip() in seen_texts:
            continue
        seen_texts.add(text.lower().strip())
        category = random.choice(list(CATEGORIES.keys()))
        dataset.append({
            "requirement_id": f"REQ-{req_id:04d}",
            "text": text,
            "quality_score": random.randint(20, 50),
            "issues": issues,
            "severity_level": severity,
            "category": category,
            "improvement_suggestion": IMPROVEMENT_SUGGESTIONS.get(issues[0] if issues else "ambiguity", "Review ISO 29148 guidelines"),
            "iso_violations": [k for k in ["unambiguous", "verifiable", "complete", "consistent"] if any(kw in str(issues) for kw in ["ambiguity", "non_verifiable", "incomplete", "inconsistency"])],
            "is_compliant": False
        })
        req_id += 1
    
    # Add good quality requirements
    for text, issues, severity in good_reqs[:good_count]:
        if text.lower().strip() in seen_texts:
            continue
        seen_texts.add(text.lower().strip())
        category = random.choice(list(CATEGORIES.keys()))
        dataset.append({
            "requirement_id": f"REQ-{req_id:04d}",
            "text": text,
            "quality_score": random.randint(90, 100),
            "issues": [],
            "severity_level": "minor",
            "category": category,
            "improvement_suggestion": "Exceeds ISO 29148 quality standards",
            "iso_violations": [],
            "is_compliant": True
        })
        req_id += 1
    
    # Add intermediate quality requirements
    intermediate_templates = [
        ("The system shall allow users to create accounts with email and password verification", ["incomplete"], "major"),
        ("The API shall return JSON responses with appropriate HTTP status codes", ["incomplete"], "major"),
        ("The system shall validate user input to prevent SQL injection and XSS attacks", ["ambiguity"], "major"),
        ("Users shall be able to view their profile information and edit basic details", ["incomplete"], "major"),
        ("The database shall backup hourly to prevent data loss", ["incomplete", "ambiguity"], "major"),
        ("The system shall collect and store audit logs for compliance verification", [], "major"),
        ("Search results shall be paginated with configurable items per page", [], "minor"),
        ("The system shall support exporting transaction history in CSV and PDF formats", [], "minor"),
        ("Administration pages shall restrict access based on role-based permissions", [], "minor"),
        ("Error messages shall clearly describe the problem and suggest remediation steps", [], "minor"),
    ]
    
    while len(dataset) < total_samples:
        text, issues, severity = random.choice(intermediate_templates)
        if text.lower().strip() in seen_texts:
            continue
        seen_texts.add(text.lower().strip())
        category = random.choice(list(CATEGORIES.keys()))
        dataset.append({
            "requirement_id": f"REQ-{req_id:04d}",
            "text": text,
            "quality_score": random.randint(60, 80),
            "issues": issues,
            "severity_level": severity,
            "category": category,
            "improvement_suggestion": "Improve specificity and measurability to meet ISO 29148 standards",
            "iso_violations": ["verifiable"] if "ambiguity" in issues else (["complete"] if "incomplete" in issues else []),
            "is_compliant": False
        })
        req_id += 1
    
    return dataset



def save_dataset(dataset: List[Dict], filepath: str = "data/iso29148_dataset.json"):
    """Save dataset to JSON file."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_samples": len(dataset),
            "categories": CATEGORIES,
            "requirements": dataset
        }, f, indent=2, ensure_ascii=False)
    print(f"✓ Dataset saved to {filepath} ({len(dataset)} samples)")


if __name__ == "__main__":
    dataset = generate_dataset(500)
    save_dataset(dataset)
    
    # Print statistics
    compliant = sum(1 for r in dataset if r["is_compliant"])
    non_compliant = len(dataset) - compliant
    print(f"\n📊 Dataset Statistics:")
    print(f"  Total Requirements: {len(dataset)}")
    print(f"  Compliant with ISO 29148: {compliant} ({compliant/len(dataset)*100:.1f}%)")
    print(f"  Non-Compliant: {non_compliant} ({non_compliant/len(dataset)*100:.1f}%)")
    print(f"\n  By Category:")
    for cat in CATEGORIES:
        count = sum(1 for r in dataset if r["category"] == cat)
        print(f"    {cat.capitalize()}: {count}")
