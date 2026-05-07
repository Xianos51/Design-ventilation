#!/usr/bin/env python3
"""
Build script for standalone Design Ventilation application.
This script creates a single index.html file with all CSS and JS inlined,
compatible with file:// protocol (no server required).
"""
import re

# Step 1: Get clean HTML structure from current index.html (without scripts)
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove all <script>...</script> tags and their content
html_no_scripts = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

# Also remove the link to src/styles.css if it exists
html_no_scripts = re.sub(r'<link[^>]*href=["\']src/styles\.css["\'][^>]*>', '', html_no_scripts)

# Step 2: Read CSS
with open('src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Step 3: Read all JS files in correct order
js_files = [
    'src/models/Point.js',
    'src/models/Element.js', 
    'src/models/Caisson.js',
    'src/models/Bouche.js',
    'src/models/Conduit.js',
    'src/calculations/flowCalculations.js',
    'src/calculations/pressureCalculations.js',
    'src/utils/networkValidation.js',
    'src/utils/pdfExport.js',
    'src/app/VentilationApp.js',
    'src/index.js' 
]

js_content = ''
for file in js_files:
    with open(file, 'r', encoding='utf-8') as f:
        js_content += f.read() + '\n\n'

# Step 4: Add PDF-lib loader (conditional for file:// protocol)
pdf_lib_loader = """
// Charger PDF-lib seulement si on est pas en file://
if (window.location.protocol !== 'file:') {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js';
    script.onload = function() {
        window.PDF_LIB_LOADED = true;
    };
    script.onerror = function() {
        window.PDF_LIB_LOADED = false;
        console.warn('PDF-lib non chargé, export PDF désactivé');
    };
    document.head.appendChild(script);
} else {
    window.PDF_LIB_LOADED = false;
    console.warn('PDF-lib ne se charge pas avec file://, export PDF désactivé');
}
"""

# Step 5: Inject CSS into head and JS into body
head_end = html_no_scripts.find('</head>')
if head_end != -1:
    html_no_scripts = html_no_scripts[:head_end] + f'\n    <style>{css}</style>' + html_no_scripts[head_end:]

body_end = html_no_scripts.find('</body>')
if body_end != -1:
    html_no_scripts = html_no_scripts[:body_end] + f'\n    <script>\n{pdf_lib_loader}\n{js_content}\n    </script>' + html_no_scripts[body_end:]

# Step 6: Write new index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_no_scripts)

print(f'Standalone index.html generated - Size: {len(html_no_scripts)} bytes')
print('The application can now be opened directly via file:// protocol.')
