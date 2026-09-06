import json

file_path = 'frontend/src/data/knowledge-base.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    topic = item['topic'].lower()
    variants = [
        f"how to {topic}",
        f"i want to know about {topic}",
        f"what is {topic}",
        f"tell me about {topic}",
        f"explain {topic}",
        f"{topic} kya hai",
        f"mujhe {topic} ke baare me batao",
        f"need help with {topic}",
        f"{topic} details pls",
        f"can u show {topic}",
        f"where to find {topic}",
        f"setup {topic}",
        f"how do i use {topic}",
        f"teh {topic}",
        f"hwo to {topic}",
        f"pls {topic}",
        f"about {topic}"
    ]
    # append variants to keywords if not already present
    for v in variants:
        if v not in item['keywords']:
            item['keywords'].append(v)
            
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
print("Updated knowledge base with expanded keywords.")
