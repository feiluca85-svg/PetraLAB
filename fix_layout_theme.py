with open('src/app/layout.tsx', 'r') as f:
    content = f.read()

content = content.replace('color: "#008069"', 'color: "#25D366"')
content = content.replace('color: "#111B21"', 'color: "#0B141A"')

with open('src/app/layout.tsx', 'w') as f:
    f.write(content)
print("Layout theme colors updated.")
