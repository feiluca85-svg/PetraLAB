with open('src/app/globals.css', 'r') as f:
    css = f.read()

css = css.replace('--font-sans: var(--font-geist-sans);', '')
css = css.replace('--font-mono: var(--font-geist-mono);', '')

with open('src/app/globals.css', 'w') as f:
    f.write(css)

print("CSS font overrides removed.")
