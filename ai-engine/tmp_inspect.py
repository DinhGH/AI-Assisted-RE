import json
from pathlib import Path
p = Path('data/iso29148_dataset_optimized.json')
print('exists', p.exists())
if p.exists():
    d = json.loads(p.read_text(encoding='utf-8'))
    reqs = d.get('requirements') if isinstance(d, dict) else d
    print('type', type(reqs), 'len', len(reqs) if reqs else 0)
    texts = [r['text'].lower().strip() for r in reqs] if reqs else []
    print('unique', len(set(texts)))
    from collections import Counter
    c = Counter(texts)
    dup = [t for t,v in c.items() if v>1]
    print('dups', len(dup))
    print('sample texts:', texts[:5])
