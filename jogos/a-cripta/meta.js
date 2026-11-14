// Progresso permanente: ouro guardado entre partidas (cofre), Forja de melhorias e classes para liberar.
import { Plataforma } from '../../motor/plataforma.js';

export const MELHORIAS = [
  { k: 'vida', icone: '♥', custos: [100, 220, 400, 650, 1000] },     // +10% de vida por nível
  { k: 'dano', icone: '⚔', custos: [120, 260, 450, 700, 1100] },     // +8% de dano por nível
  { k: 'exercito', icone: '☠', custos: [300, 750, 1400] },           // +1 esqueleto no exército
  { k: 'pocoes', icone: '⚗', custos: [150, 400, 800] },              // +1 poção inicial
];
export const PRECO_CLASSE = { Knight: 0, Barbarian: 400, Ranger: 600, Mage: 800, Rogue_Hooded: 1000 };

const est = { cofre: Plataforma.ler('cofre', 0), meta: Plataforma.ler('meta', {}), classes: Plataforma.ler('classes', ['Knight']) };
const salva = () => { Plataforma.salvar('cofre', est.cofre); Plataforma.salvar('meta', est.meta); Plataforma.salvar('classes', est.classes); };

export const Meta = {
  get cofre() { return est.cofre; },
  nivel: (k) => est.meta[k] || 0,
  custo(k) { const m = MELHORIAS.find((x) => x.k === k); return m.custos[this.nivel(k)] ?? null; },
  comprar(k) { const c = this.custo(k); if (c == null || est.cofre < c) return false; est.cofre -= c; est.meta[k] = this.nivel(k) + 1; salva(); return true; },
  liberada: (k) => est.classes.includes(k),
  liberar(k) { const p = PRECO_CLASSE[k] ?? 0; if (this.liberada(k)) return true; if (est.cofre < p) return false; est.cofre -= p; est.classes.push(k); salva(); return true; },
  deposita(v) { est.cofre += Math.max(0, Math.round(v)); salva(); },
  /** Aplica as melhorias no começo da partida. */
  aplica(j) { j.multVida(1 + .1 * this.nivel('vida')); j.BONUS.dano *= 1 + .08 * this.nivel('dano'); j.BONUS.exercito += this.nivel('exercito'); j.ganhaPocoes(this.nivel('pocoes')); },
};

// ---------- painel da Forja (no menu) ----------
const CSS = `#forja{display:none;margin-top:10px;padding:12px;border:1px solid #4a3a24;border-radius:6px;background:rgba(14,10,8,.94);color:#e9dcc0;font:700 14px 'Alegreya Sans'}
#forja.on{display:block}#forja .fl{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #2a2016}#forja .fl:last-child{border:0}
#forja i{font-style:normal;font-size:22px;width:28px;text-align:center;color:var(--ouro)}#forja .ft{flex:1;text-align:left}#forja .ft b{display:block;font:800 13px 'Cinzel';color:var(--ouro)}#forja .ft small{color:#a89470}
#forja .pts{letter-spacing:2px;color:#ffd84a;font-size:12px}#forja button{padding:7px 10px;border-radius:4px;border:1px solid var(--ouro2);background:#2a1d10;color:var(--ouro);font:800 12px 'Cinzel';white-space:nowrap}
#forja button:disabled{opacity:.4}`;

export function desenhaForja(el, tr, aoMudar) {
  if (!document.getElementById('forjaCss')) { const s = document.createElement('style'); s.id = 'forjaCss'; s.textContent = CSS; document.head.appendChild(s); }
  el.innerHTML = MELHORIAS.map((m) => { const n = Meta.nivel(m.k), c = Meta.custo(m.k);
    return `<div class="fl"><i>${m.icone}</i><div class="ft"><b>${tr('forja.' + m.k + '.n')}</b><small>${tr('forja.' + m.k + '.d')}</small><div class="pts">${'●'.repeat(n)}${'○'.repeat(m.custos.length - n)}</div></div>
    <button data-k="${m.k}" ${c == null || Meta.cofre < c ? 'disabled' : ''}>${c == null ? tr('forja.max') : '◉ ' + c}</button></div>`; }).join('');
  el.querySelectorAll('button[data-k]').forEach((b) => b.onclick = () => { if (Meta.comprar(b.dataset.k)) { aoMudar(); desenhaForja(el, tr, aoMudar); } });
}
