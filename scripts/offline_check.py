import os,re,sys
bad=[]
for base,dirs,files in os.walk("frontend/dist"):
    for fn in files:
        if fn.endswith((".js",".html",".css")):
            p=os.path.join(base,fn); s=open(p,encoding="utf-8",errors="ignore").read()
            if re.search(r'https?://(?!localhost|127\.0\.0\.1)',s): bad.append(p)
if bad:
    print("External URLs found:",bad); sys.exit(1)
print("Offline check passed.")
