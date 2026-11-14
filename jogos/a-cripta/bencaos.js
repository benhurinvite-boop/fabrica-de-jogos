// Bênçãos: depois de cada sala, escolha 1 entre 3. Elas se acumulam e combinam com o Exército de Ossos.
export const BONUS = { dano: 1, vida: 0, exercito: 0, aliadoVida: 1, aliadoDano: 1, explosivo: false, recarga: 1, ouro: 1, crit: 0, vel: 1, sifao: 0, pocoes: 0 };

// k = chave do texto (textos.bencaos.k), r = raridade, a = efeito
const LISTA = [
  { k: 'legiao', r: 'raro', a: (b) => { b.exercito += 2; } },
  { k: 'explosivos', r: 'lendario', a: (b) => { b.explosivo = true; }, unica: true },
  { k: 'ferro', r: 'magico', a: (b) => { b.aliadoVida *= 1.5; } },
  { k: 'laminas', r: 'magico', a: (b) => { b.aliadoDano *= 1.4; } },
  { k: 'furia', r: 'magico', a: (b) => { b.dano *= 1.2; } },
  { k: 'pedra', r: 'magico', a: (b, j) => { b.vida += 0.25; j.aumentaVida(0.25); } },
  { k: 'sifao', r: 'raro', a: (b) => { b.sifao += 0.03; } },
  { k: 'recarga', r: 'raro', a: (b) => { b.recarga *= 1.25; } },
  { k: 'ouro', r: 'magico', a: (b) => { b.ouro *= 1.5; } },
  { k: 'pocoes', r: 'magico', a: (b, j) => { j.ganhaPocoes(2); } },
  { k: 'critico', r: 'raro', a: (b) => { b.crit += 0.1; } },
  { k: 'marcha', r: 'magico', a: (b) => { b.vel *= 1.15; } },
];
const COR = { magico: '#6aa8ff', raro: '#ffd84a', lendario: '#ff9a2a' };
const ICONE = { legiao: '☠', explosivos: '✹', ferro: '⛨', laminas: '⚔', furia: '🜂', pedra: '◆', sifao: '♥', recarga: '⟳', ouro: '◉', pocoes: '⚗', critico: '✦', marcha: '➤' };

const CSS = `#benc{position:fixed;inset:0;z-index:15;display:none;place-items:center;background:radial-gradient(rgba(10,6,4,.55),rgba(0,0,0,.85));padding:16px}
#benc.on{display:grid}#benc h3{margin:0 0 4px;text-align:center;font:700 clamp(24px,6vw,38px) 'Cinzel Decorative';color:var(--ouro);text-shadow:0 3px 0 #000}
#benc>div>p{margin:0 0 14px;text-align:center;font:700 12px 'Cinzel';letter-spacing:.24em;color:#a89470;text-transform:uppercase}
.bcs{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.bc{width:min(30vw,190px);min-width:150px;padding:16px 12px;border-radius:8px;border:2px solid var(--c);background:linear-gradient(rgba(24,16,10,.96),rgba(10,7,5,.98));box-shadow:0 0 24px color-mix(in srgb,var(--c) 35%,transparent),0 8px 0 #000;color:#f0e2c2;text-align:center;cursor:pointer;animation:bcIn .35s ease-out backwards}
.bc:nth-child(2){animation-delay:.08s}.bc:nth-child(3){animation-delay:.16s}.bc:hover{transform:translateY(-4px)}
@keyframes bcIn{from{opacity:0;transform:translateY(30px) scale(.9)}}
.bc i{display:block;font-style:normal;font-size:40px;color:var(--c);text-shadow:0 0 18px var(--c)}
.bc b{display:block;margin:6px 0 2px;font:800 17px 'Cinzel';color:var(--c)}.bc small{display:block;font:800 10px 'Cinzel';letter-spacing:.14em;color:#8a7a5a;text-transform:uppercase}
.bc span{display:block;margin-top:8px;font:700 14px/1.3 'Alegreya Sans'}.bc em{display:block;margin-top:8px;font:800 11px 'Cinzel';color:#7a6a4a;font-style:normal}`;

let el = null; const pegas = new Set();

export function escolheBencao(tr, jogo) {
  if (!el) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); el = document.createElement('div'); el.id = 'benc'; document.body.appendChild(el); }
  const pool = LISTA.filter((x) => !(x.unica && pegas.has(x.k)));
  const opc = []; while (opc.length < 3 && pool.length) opc.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  el.innerHTML = `<div><h3>${tr('bencaoT')}</h3><p>${tr('bencaoP')}</p><div class="bcs">${opc.map((x, i) =>
    `<div class="bc" data-i="${i}" style="--c:${COR[x.r]}"><i>${ICONE[x.k]}</i><b>${tr('bencaos.' + x.k + '.n')}</b><small>${tr('raridade.' + x.r)}</small><span>${tr('bencaos.' + x.k + '.d')}</span><em>${i + 1}</em></div>`).join('')}</div></div>`;
  el.classList.add('on');
  return new Promise((ok) => {
    const pega = (i) => { const x = opc[i]; if (!x) return; x.a(BONUS, jogo); pegas.add(x.k); el.classList.remove('on'); removeEventListener('keydown', tecla); ok(x); };
    const tecla = (e) => { const n = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code]; if (n != null) pega(n); };
    el.querySelectorAll('.bc').forEach((c) => c.addEventListener('pointerdown', (e) => { e.preventDefault(); pega(+c.dataset.i); }));
    setTimeout(() => addEventListener('keydown', tecla), 300);
  });
}
