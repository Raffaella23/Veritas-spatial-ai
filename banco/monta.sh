#!/bin/sh
# Rimonta il banco di prova headless. Da eseguire dalla radice del repo.
#
# I CDN non sono raggiungibili dalle sandbox, quindi three, spark e bvh vanno
# copiati in locale e l'importmap riscritto sui percorsi copiati. Supabase e'
# sostituito da uno stub che finge login e progetto: il banco non deve
# autenticare, deve caricare modelli.
set -e
npm install --no-audit --no-fund
mkdir -p banco/vendor
cp -r node_modules/three/build banco/vendor/three-build
mkdir -p banco/vendor/three-addons && cp -r node_modules/three/examples/jsm/* banco/vendor/three-addons/
cp node_modules/three-mesh-bvh/build/index.module.js banco/vendor/bvh.module.js
cp node_modules/@sparkjsdev/spark/dist/spark.module.js banco/vendor/spark.module.js
python3 - <<'PY'
import re
d = open('index.html', encoding='utf-8').read()
d = d.replace('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js', './vendor/three-build/three.module.js')
d = d.replace('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/', './vendor/three-addons/')
d = d.replace('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js', './vendor/bvh.module.js')
d = d.replace('https://sparkjs.dev/releases/spark/2.1.0/spark.module.js', './vendor/spark.module.js')
d = re.sub(r'src="https://[^"]*supabase[^"]*"', 'src="./finti/supabase_finto.js"', d)
open('banco/index.html', 'w', encoding='utf-8').write(d)
print('banco/index.html generato')
PY
cp -f airport_foot_traffic.glb banco/ 2>/dev/null || true
python3 veritas_genera_splat.py banco/prova_gaussiane.ply
echo "Ora:  (cd banco && python3 -m http.server 8899 &)  poi  node banco/prova.mjs"
