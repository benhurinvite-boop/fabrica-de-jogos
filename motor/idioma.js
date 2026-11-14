// Idiomas do jogo. Inglês é o padrão (portais globais); português se o navegador estiver em PT.
// Uso: Idioma.registrar(TEXTOS); t('chave', {n: 3}); Idioma.aplicar() troca todo [data-t].
import { Plataforma } from './plataforma.js';

let tabela = { en: {}, pt: {} };
let atual = 'en';
const ouvintes = [];

function detecta() {
  const url = new URLSearchParams(location.search).get('lang');
  if (url === 'pt' || url === 'en') return url;
  const salvo = Plataforma.ler('idioma');
  if (salvo === 'pt' || salvo === 'en') return salvo;
  return (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Busca o texto. Aceita caminho com pontos ("classes.Knight.n") e troca {variaveis}. */
export function t(chave, vars) {
  const busca = (tab) => chave.split('.').reduce((o, k) => (o == null ? o : o[k]), tab);
  let v = busca(tabela[atual]);
  if (v == null) v = busca(tabela.en);
  if (v == null) return chave;
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return v;
}

export const Idioma = {
  get atual() { return atual; },
  get local() { return atual === 'pt' ? 'pt-BR' : 'en-US'; },
  registrar(t) { tabela = t; atual = detecta(); document.documentElement.lang = atual; },
  definir(l) {
    atual = l; document.documentElement.lang = l; Plataforma.salvar('idioma', l);
    this.aplicar(); ouvintes.forEach((f) => f(l));
  },
  alternar() { this.definir(atual === 'pt' ? 'en' : 'pt'); },
  aoMudar(f) { ouvintes.push(f); },
  /** Preenche todo elemento com data-t="chave" (e data-t-aria para aria-label). */
  aplicar(raiz = document) {
    raiz.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    raiz.querySelectorAll('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
  },
};
