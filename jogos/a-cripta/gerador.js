// Gera um andar diferente a cada partida (a mesma "semente" gera o mesmo andar em todos os aparelhos do co-op).
// Layout: salão do chefe no topo, salas de combate empilhadas com corredores de 3 casas, entrada embaixo.
// Legenda do mapa: # parede, . chão, P início, k/r/m/w inimigos, O Capitão, G Gorrath, C baú, S saída, p pilar, b barris.

export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const NOMES = ['ossuario', 'galeria', 'cripta', 'capela', 'tumulos', 'catacumba'];
const LARG = 30;

export function geraAndar(seed, andar) {
  const r = rng(seed * 31 + andar * 7919);
  const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const nCombate = Math.min(5, 2 + andar);
  // tamanhos (de cima para baixo): chefe, combates..., entrada
  const salas = [];
  const chefe = { k: 'capitao', w: 20, h: 6, chefe: true };
  const combates = Array.from({ length: nCombate }, (_, i) => ({ k: NOMES[(i + andar) % NOMES.length], w: int(8, 12), h: int(5, 6) }));
  const entrada = { k: 'inicio', w: 7, h: 4, inicio: true };
  const ordem = [chefe, ...combates, entrada];
  let z = 1;
  for (const s of ordem) { s.z0 = z; s.z1 = z + s.h; z = s.z1 + 3; }
  const ALT = ordem[ordem.length - 1].z1 + 1;
  const g = Array.from({ length: ALT }, () => Array(LARG).fill('#'));
  const pinta = (x0, x1, z0, z1, c = '.') => { for (let zz = z0; zz < z1; zz++) for (let xx = x0; xx < x1; xx++) g[zz][xx] = c; };
  // posição horizontal de cada sala e corredores
  chefe.x0 = 5; chefe.x1 = chefe.x0 + chefe.w;
  for (let i = 1; i < ordem.length; i++) { const s = ordem[i]; s.x0 = int(1, LARG - 1 - s.w); s.x1 = s.x0 + s.w; }
  for (const s of ordem) pinta(s.x0, s.x1, s.z0, s.z1);
  for (let i = 0; i < ordem.length - 1; i++) {
    const cima = ordem[i], baixo = ordem[i + 1];
    const a = Math.max(cima.x0 + 1, baixo.x0 + 1), b = Math.min(cima.x1 - 3, baixo.x1 - 3);
    let cx; if (a <= b) cx = int(a, b);
    else { // sem sobreposição: corredor em L dentro da faixa de 3 linhas
      cx = baixo.x0 + 1; const ax = cima.x0 + 1; pinta(Math.min(cx, ax), Math.max(cx, ax) + 2, cima.z1 + 1, cima.z1 + 2); pinta(ax, ax + 2, cima.z1, cima.z1 + 1); }
    pinta(cx, cx + 2, cima.z1, baixo.z0);
    const portaCima = a <= b ? cx : cima.x0 + 1;
    cima.saida = [[portaCima, cima.z1], [portaCima + 1, cima.z1]];
    baixo.entradaP = [[cx, baixo.z0 - 1], [cx + 1, baixo.z0 - 1]];
  }
  // conteúdo das salas
  const livre = (s, margem = 1) => { for (let t = 0; t < 60; t++) { const x = int(s.x0 + margem, s.x1 - 1 - margem), zz = int(s.z0 + margem, s.z1 - 1 - margem); if (g[zz][x] === '.') return [x, zz]; } return null; };
  const poe = (s, c, margem) => { const p = livre(s, margem); if (p) g[p[1]][p[0]] = c; };
  // chefe
  g[chefe.z0][chefe.x0 + 10] = 'C'; g[chefe.z0 + 1][chefe.x1 - 3] = 'S'; g[chefe.z0 + 2][chefe.x0 + 10] = andar >= 3 ? 'G' : 'O';
  g[chefe.z0 + 1][chefe.x0 + 3] = 'p'; g[chefe.z0 + 4][chefe.x0 + 3] = 'p';
  for (let i = 0; i < Math.min(4, andar + 1); i++) poe(chefe, 'k', 2);
  chefe.k = andar >= 3 ? 'gorrath' : 'capitao';
  // combates: pilares + inimigos que crescem com o andar
  const tipos = andar === 1 ? 'kkkrrm' : andar === 2 ? 'kkrrmmw' : 'krrmmww';
  combates.forEach((s, i) => {
    const pil = int(0, 2);
    if (pil === 1) for (const [dx, dz] of [[2, 1], [s.w - 3, 1], [2, s.h - 2], [s.w - 3, s.h - 2]]) g[s.z0 + dz][s.x0 + dx] = 'p';
    if (pil === 2) for (let x = s.x0 + 3; x < s.x1 - 2; x += 3) g[s.z0 + Math.floor(s.h / 2)][x] = 'p';
    if (r() < .4) poe(s, 'b', 0);
    const n = Math.min(9, 3 + andar + i + int(0, 1));
    for (let k = 0; k < n; k++) poe(s, tipos[int(0, tipos.length - 1)], 1);
  });
  g[entrada.z0 + 2][entrada.x0 + 3] = 'P';
  // salas no formato do jogo
  for (const s of ordem) salas.push({ k: s.k, x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, chefe: !!s.chefe, portas: s.inicio ? [] : [...(s.entradaP || []), ...(s.saida || [])], ativa: !!s.inicio, feita: !!s.inicio });
  return { mapa: g.map((l) => l.join('')), salas: salas.reverse(), inicioSala: entrada };
}
