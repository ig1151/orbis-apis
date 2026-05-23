with open('src/index.ts', 'r') as f:
    lines = f.readlines()

# Find the line where the old-style blocks start after our new router map
# Look for the first import statement that appears AFTER the routerMap block
new_router_map_end = None
for i, line in enumerate(lines):
    if "// Route dispatcher" in line:
        new_router_map_end = i
        break

# Find where the old duplicate imports/routes start (after the dispatcher)
old_junk_start = None
for i in range(new_router_map_end or 0, len(lines)):
    line = lines[i].strip()
    # Old-style blocks start with an import after the dispatcher
    if line.startswith("import ") and "Router" in line and i > (new_router_map_end or 0) + 20:
        old_junk_start = i
        break
    # Or old app.use/app.get after dispatcher
    if line.startswith("app.get('/smart-contract-metadata"):
        old_junk_start = i
        break

print(f"Dispatcher at line: {new_router_map_end}")
print(f"Old junk starts at line: {old_junk_start}")

if old_junk_start:
    # Keep everything up to old_junk_start
    clean = lines[:old_junk_start]
    
    # Find the 404 handler and listen call from original
    tail = []
    in_tail = False
    for line in lines[old_junk_start:]:
        if "app.use('/api/unified-ai'" in line or "app.use((_req" in line or "app.listen" in line:
            in_tail = True
        if in_tail:
            tail.append(line)
    
    clean.extend(tail)
    
    with open('src/index.ts', 'w') as f:
        f.writelines(clean)
    
    print(f"✅ Done. Lines: {len(clean)}")
else:
    print("❌ Could not find junk start — check manually")
