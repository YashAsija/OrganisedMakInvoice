import re
import sys

with open(r"f:\Projects\MakInvoices\OrganisedMakInvoice\frontend\src\components\Homepage.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# We only care about the content inside the return statement of Homepage
start_idx = code.find("return (")
if start_idx == -1:
    print("No return statement")
    sys.exit(0)

content = code[start_idx:]
pos = 0
length = len(content)

stack = []

while pos < length:
    # Check for JSX comment
    if content[pos:pos+4] == "{/*":
        # Skip until */
        end_comment = content.find("*/}", pos)
        if end_comment != -1:
            pos = end_comment + 3
        else:
            pos += 4
        continue
    # Check for normal comment
    if content[pos:pos+2] == "/*":
        end_comment = content.find("*/", pos)
        if end_comment != -1:
            pos = end_comment + 2
        else:
            pos += 2
        continue
    if content[pos:pos+2] == "//":
        end_line = content.find("\n", pos)
        if end_line != -1:
            pos = end_line + 1
        else:
            pos += 2
        continue
        
    # Check for tag
    if content[pos] == '<':
        next_char = content[pos+1] if pos+1 < length else ''
        if next_char.isalpha() or next_char == '/' or next_char == '_':
            tag_end = pos + 1
            in_quote = None
            is_self_closing = False
            while tag_end < length:
                char = content[tag_end]
                if in_quote:
                    if char == in_quote:
                        in_quote = None
                elif char in ['"', "'", '`']:
                    in_quote = char
                elif char == '>' and not in_quote:
                    if content[tag_end-1] == '/':
                        is_self_closing = True
                    break
                tag_end += 1
            
            tag_str = content[pos:tag_end+1]
            match = re.match(r'</?([a-zA-Z0-9\._\-:]+)', tag_str)
            if match:
                tag_name = match.group(1)
                line_num = code[:start_idx + pos].count('\n') + 1
                
                # Ignore self-closing tags
                if is_self_closing or tag_name in ['input', 'br', 'hr', 'img', 'rect', 'circle', 'path', 'line', 'polyline', 'polygon']:
                    pass
                elif tag_str.startswith('</'):
                    if stack:
                        last_tag, last_line = stack.pop()
                        if last_tag != tag_name:
                            print(f"Line {line_num} | Mismatch: closed </{tag_name}> but expected </{last_tag}> (opened on line {last_line})")
                    else:
                        print(f"Line {line_num} | Error: Closed </{tag_name}> but stack is empty")
                else:
                    stack.append((tag_name, line_num))
            
            pos = tag_end + 1
            continue
            
    pos += 1

print(f"\nFinal Stack size: {len(stack)}")
for tag, line in reversed(stack):
    print(f"Unclosed <{tag}> opened on line {line}")
