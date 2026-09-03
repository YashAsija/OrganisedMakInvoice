import urllib.request, json
try:
    req = urllib.request.Request('http://localhost:3000/api/chat/message', data=b'{"message":"hi"}', headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print("ERROR:", e.code)
    print(e.read().decode())
