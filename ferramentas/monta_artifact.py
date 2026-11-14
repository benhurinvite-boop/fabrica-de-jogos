"""Monta uma cópia do jogo para publicar como artifact do Claude (página privada de teste).
O artifact não aceita .glb nem fontes locais: os modelos viram base64 (.txt) e as fontes vêm do Google Fonts.
Uso: python ferramentas/monta_artifact.py a-cripta /tmp/dist   → depois publicar /tmp/dist com publish_files.
Artifact atual de Gorrath's Crypt: slug 8f69ddfd-af82-4d5d-a383-6c2e060d2629
"""
import base64, os, re, shutil, sys
jogo, dist = sys.argv[1], sys.argv[2]
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(raiz, 'jogos', jogo)
shutil.rmtree(dist, ignore_errors=True); os.makedirs(os.path.join(dist, 'motor'))
for nome in os.listdir(src):
    a = os.path.join(src, nome)
    (shutil.copytree if os.path.isdir(a) else shutil.copy)(a, os.path.join(dist, nome))
for nome in os.listdir(os.path.join(raiz, 'motor')):
    if nome == 'fontes': continue
    a = os.path.join(raiz, 'motor', nome)
    (shutil.copytree if os.path.isdir(a) else shutil.copy)(a, os.path.join(dist, 'motor', nome))
for r, _, fs in os.walk(os.path.join(dist, 'assets')):
    for f in fs:
        if f.endswith('.glb'):
            p = os.path.join(r, f)
            open(p[:-4] + '.txt', 'w').write(base64.b64encode(open(p, 'rb').read()).decode()); os.remove(p)
s = open(os.path.join(dist, 'index.html')).read()
s = s.replace('<link rel="stylesheet" href="../../motor/fontes/fontes.css">', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Cinzel+Decorative:wght@700&family=Alegreya+Sans:wght@400;700;800&display=swap">')
s = s.replace('../../motor/', './motor/')
i = s.find('function carrega(url)'); j = s.find('\n', i)
s = s[:i] + ("function carrega(url){url=url.replace(/\\.(glb|gltf)$/,'.txt');if(!cache.has(url)){totalCarga++;cache.set(url,fetch(M+url).then(r=>{if(!r.ok)throw new Error('arquivo '+url+' ('+r.status+')');return r.text()}).then(t64=>new Promise((ok,erro)=>{const bin=atob(t64.trim());const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);loader.parse(u.buffer,M,g=>{carregados++;$('carga').textContent=tr('carregando')+' '+Math.round(carregados/totalCarga*100)+'%';ok(g)},erro)})))}return cache.get(url)}") + s[j:]
open(os.path.join(dist, 'index.html'), 'w').write(s)
print('pronto:', sum(len(f) for _, _, f in os.walk(dist)), 'arquivos em', dist)
