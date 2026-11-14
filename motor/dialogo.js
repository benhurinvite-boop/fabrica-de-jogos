// Diálogos e cutscenes: caixa com retrato, texto que digita, voz de "resmungo" sintetizada
// (funciona em qualquer idioma), faixas de cinema e botão Pular. Também dicas rápidas que não pausam.
//
// Dialogo.configurar({ audio: () => AudioContext|null, personagens: { pip: {...} }, textos: { pular, continuar } })
// await Dialogo.cena([{ quem: 'pip', texto: '...' }], { aoLinha: (linha, i) => {} })
// Dialogo.dica('pip', 'texto', 3000)

const CSS = `
#dlgFaixas{position:fixed;inset:0;pointer-events:none;z-index:20}
#dlgFaixas::before,#dlgFaixas::after{content:"";position:absolute;left:0;right:0;height:0;background:#000;transition:height .35s ease}
#dlgFaixas::before{top:0}#dlgFaixas::after{bottom:0}
#dlgFaixas.on::before,#dlgFaixas.on::after{height:9vh}
#dlg{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(94vw,640px);z-index:21;display:none;gap:14px;align-items:flex-start;
 padding:14px 16px 16px;background:linear-gradient(rgba(14,10,8,.94),rgba(8,6,5,.96));border:1px solid #6a5230;box-shadow:0 0 0 2px #000,0 14px 40px rgba(0,0,0,.7);border-radius:6px;cursor:pointer}
#dlg.on{display:flex;animation:dlgIn .25s ease-out}
#dlg.dica{bottom:auto;left:max(12px,env(safe-area-inset-left));transform:none;top:calc(max(12px,env(safe-area-inset-top)) + 100px);width:min(62vw,340px);padding:10px 12px;cursor:default;pointer-events:none;animation:none}
#dlg.dica .dlgRet{width:46px;height:46px;font-size:20px}#dlg.dica .dlgTxt{font-size:15px;min-height:0}#dlg.dica .dlgPe{display:none}
@keyframes dlgIn{from{opacity:0;transform:translate(-50%,12px)}}
.dlgRet{flex:none;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font:800 30px 'Cinzel',serif;color:#fff;
 box-shadow:0 0 0 2px #000,0 0 0 4px var(--c,#a8823c),0 0 22px var(--c,#a8823c);background:radial-gradient(circle at 35% 30%,var(--c2,#fff),var(--c,#a8823c) 60%,#000 140%);overflow:hidden;text-shadow:0 2px 3px #000}
.dlgRet img{width:100%;height:100%;object-fit:cover}
.dlgCorpo{flex:1;min-width:0}
.dlgNome{font:800 13px 'Cinzel',serif;letter-spacing:.14em;text-transform:uppercase;color:var(--c,#e9c77b);text-shadow:0 1px 2px #000}
.dlgTxt{margin-top:4px;font:700 18px/1.35 'Alegreya Sans',sans-serif;color:#f3e6c8;min-height:2.7em}
.dlgPe{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font:700 12px 'Alegreya Sans',sans-serif;color:#9a8664}
.dlgPe span{animation:dlgPisca 1s infinite}@keyframes dlgPisca{50%{opacity:.35}}
#dlgPular{position:fixed;z-index:22;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));display:none;padding:8px 14px;border-radius:4px;
 border:1px solid #6a5230;background:rgba(10,8,6,.85);color:#e9c77b;font:800 12px 'Cinzel',serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
#dlgPular.on{display:block}
`;

let cfg = { audio: () => null, personagens: {}, textos: { pular: 'Skip', continuar: 'Tap to continue' } };
let el = null;
let saida = null; // compressor/limitador próprio para a voz não estourar

function monta() {
  if (el) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const faixas = document.createElement('div'); faixas.id = 'dlgFaixas';
  const caixa = document.createElement('div'); caixa.id = 'dlg';
  caixa.innerHTML = '<div class="dlgRet"></div><div class="dlgCorpo"><div class="dlgNome"></div><div class="dlgTxt"></div><div class="dlgPe"><span></span></div></div>';
  const pular = document.createElement('button'); pular.id = 'dlgPular';
  document.body.append(faixas, caixa, pular);
  el = { faixas, caixa, pular, ret: caixa.querySelector('.dlgRet'), nome: caixa.querySelector('.dlgNome'), txt: caixa.querySelector('.dlgTxt'), pe: caixa.querySelector('.dlgPe span') };
}

function voz(quem) {
  const a = cfg.audio(); const p = cfg.personagens[quem]; if (!a || !p || !p.voz) return;
  if (!saida || saida.context !== a) {
    saida = a.createDynamicsCompressor();
    saida.threshold.value = -18; saida.ratio.value = 8; saida.attack.value = 0.003; saida.release.value = 0.1;
    const g = a.createGain(); g.gain.value = 0.8; saida.connect(g); g.connect(a.destination);
  }
  const v = p.voz; const t = a.currentTime;
  const o = a.createOscillator(); o.type = v.tipo || 'triangle';
  const f = v.freq * (0.82 + Math.random() * 0.4);
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 0.8 : 1.15), t + 0.07);
  const filtro = a.createBiquadFilter(); filtro.type = 'bandpass'; filtro.frequency.value = v.formante || f * 2.2; filtro.Q.value = 1.4;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v.vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(filtro); filtro.connect(g); g.connect(saida); o.start(t); o.stop(t + 0.09);
}

function mostraQuem(quem) {
  const p = cfg.personagens[quem] || {};
  el.caixa.style.setProperty('--c', p.cor || '#a8823c'); el.caixa.style.setProperty('--c2', p.cor2 || '#fff');
  el.ret.innerHTML = p.img ? `<img src="${p.img}" alt="">` : (p.letra || '?');
  el.nome.textContent = typeof p.nome === 'function' ? p.nome() : (p.nome || '');
}

let tidDig = null;
function digita(texto, quem, aoFim) {
  clearTimeout(tidDig); let i = 0; el.txt.textContent = '';
  const passo = () => {
    i++; el.txt.textContent = texto.slice(0, i);
    if (i % 2 === 1 && /\S/.test(texto[i - 1] || '')) voz(quem);
    if (i >= texto.length) { aoFim(); return; }
    tidDig = setTimeout(passo, /[.,!?…]/.test(texto[i - 1]) ? 120 : 28);
  };
  tidDig = setTimeout(passo, 60);
  return () => { clearTimeout(tidDig); el.txt.textContent = texto; aoFim(); };
}

export const Dialogo = {
  ativo: false,
  configurar(c) { cfg = { ...cfg, ...c, textos: { ...cfg.textos, ...(c.textos || {}) } }; },

  /** Cutscene: mostra as falas em ordem. Resolve ao terminar ou ao Pular. */
  cena(linhas, { aoLinha } = {}) {
    monta();
    return new Promise((ok) => {
      this.ativo = true; let i = -1; let completa = null; let digitando = false;
      el.caixa.className = 'on'; el.faixas.classList.add('on');
      el.pular.textContent = cfg.textos.pular; el.pular.classList.add('on');
      const termina = () => {
        if (!this.ativo) return; this.ativo = false;
        if (completa && digitando) completa();
        el.caixa.className = ''; el.faixas.classList.remove('on'); el.pular.classList.remove('on');
        removeEventListener('keydown', tecla); el.caixa.removeEventListener('pointerdown', toque); el.pular.removeEventListener('pointerdown', pula);
        ok();
      };
      const proxima = () => {
        if (digitando && completa) { completa(); return; }
        i++; if (i >= linhas.length) { termina(); return; }
        const l = linhas[i]; mostraQuem(l.quem); el.pe.textContent = '';
        if (aoLinha) aoLinha(l, i);
        digitando = true;
        completa = digita(l.texto, l.quem, () => { digitando = false; el.pe.textContent = cfg.textos.continuar + ' ▸'; });
      };
      const tecla = (e) => { if (['Space', 'Enter', 'KeyJ'].includes(e.code)) { e.preventDefault(); proxima(); } if (e.code === 'Escape') termina(); };
      const toque = (e) => { e.preventDefault(); proxima(); };
      const pula = (e) => { e.preventDefault(); e.stopPropagation(); termina(); };
      addEventListener('keydown', tecla); el.caixa.addEventListener('pointerdown', toque); el.pular.addEventListener('pointerdown', pula);
      proxima();
    });
  },

  /** Dica curta no topo da tela, sem pausar o jogo. */
  dica(quem, texto, ms = 3200) {
    monta(); if (this.ativo) return;
    mostraQuem(quem); el.caixa.className = 'on dica'; el.pe.textContent = '';
    digita(texto, quem, () => {});
    clearTimeout(this._t); this._t = setTimeout(() => { if (!this.ativo) el.caixa.className = ''; }, ms);
  },
};
