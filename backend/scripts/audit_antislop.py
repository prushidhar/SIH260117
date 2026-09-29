import os
import re

root = r"C:\Users\booya\OneDrive\Desktop\SIH260117-main\frontend\src"
files = []
for dirpath, _, filenames in os.walk(root):
    for f in filenames:
        if f.endswith(('.ts', '.tsx', '.json', '.css', '.html')):
            files.append(os.path.join(dirpath, f))

print(f"Total files scanned: {len(files)}")

# 1. Em dashes (\u2014) and En dashes (\u2013)
em_dash_files = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
            if '\u2014' in c or '\u2013' in c:
                em_dash_files.append(f)
    except Exception as e:
        pass
print(f"\n[1] Files with em/en dash: {len(em_dash_files)}")
for f in em_dash_files[:15]:
    print("  EM:", os.path.relpath(f, root))
if len(em_dash_files) > 15:
    print(f"  ...and {len(em_dash_files) - 15} more")

# 2. Purple/violet gradients
grad_hits = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
            matches = re.findall(r'(?:bg-gradient-[^\s"\'`]+|from-(?:purple|violet|fuchsia)[^\s"\'`]+|to-(?:purple|violet|fuchsia)[^\s"\'`]+)', c)
            # Filter specifically for purple/violet in gradient
            pv_matches = [m for m in matches if any(k in m for k in ['purple', 'violet', 'fuchsia'])]
            if pv_matches:
                grad_hits.append((f, set(pv_matches)))
    except Exception:
        pass
print(f"\n[2] Files with purple/violet gradients: {len(grad_hits)}")
for f, m in grad_hits:
    print("  GRAD:", os.path.relpath(f, root), m)

# 3. Pill-shaped buttons: <button ... rounded-full
button_pills = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
            # find <button with rounded-full
            button_tags = re.findall(r'<button[^>]*rounded-full[^>]*>', c)
            if button_tags:
                button_pills.append((f, len(button_tags)))
    except Exception:
        pass
print(f"\n[3] Files with <button ... rounded-full>: {len(button_pills)}")
for f, count in button_pills:
    print(f"  PILL BUTTON ({count}):", os.path.relpath(f, root))

import sys
sys.stdout.reconfigure(encoding='utf-8')

# 4. Emojis
emoji_pattern = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA70-\U0001FAFF"
    "]+", flags=re.UNICODE)

emoji_files = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
            emojis = emoji_pattern.findall(c)
            if emojis:
                emoji_files.append((f, [hex(ord(char)) for e in set(emojis) for char in e]))
    except Exception:
        pass
print(f"\n[4] Files with emojis: {len(emoji_files)}")
for f, emojis in emoji_files:
    print("  EMOJI:", os.path.relpath(f, root), emojis)

# 5. Cursor animations
cursor_anim_files = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
            if 'cursor' in c and ('animate-' in c or 'animation' in c):
                # check if there's animated cursor element
                lines = [line.strip() for line in c.split('\n') if ('cursor' in line.lower() or 'blink' in line.lower()) and ('animate' in line.lower() or 'keyframes' in line.lower())]
                if lines:
                    cursor_anim_files.append((f, lines))
    except Exception:
        pass
print(f"\n[5] Files with cursor animations: {len(cursor_anim_files)}")
for f, lines in cursor_anim_files:
    print("  CURSOR ANIM:", os.path.relpath(f, root), lines[:2])

# 6. Check landing page text, reviews, testimonials, counters, "made with ai"
landing_files = [f for f in files if 'landing' in f or 'privacy' in f or 'terms' in f]
print(f"\n[6] Landing / policy files found: {[os.path.relpath(f, root) for f in landing_files]}")
for f in landing_files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
        for kw in ['review', 'testimonial', 'rating', 'star', 'customer', 'made with ai', '5/5', '4.9', 'loved by']:
            if kw in c.lower():
                print(f"  Keyword '{kw}' found in {os.path.relpath(f, root)}")
