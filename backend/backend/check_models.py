import urllib.request, json, os

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    # try to read from frontend/.env.local
    try:
        with open("../frontend/.env.local") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"')
    except:
        pass

if not api_key:
    print("No API key")
    exit(1)

req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}')
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
for m in data.get("models", []):
    if "embed" in m["name"]:
        print(m["name"], m.get("supportedGenerationMethods"))
