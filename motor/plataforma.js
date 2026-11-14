// Camada única de plataforma: Poki, CrazyGames ou nenhuma (itch.io, Vercel, local).
// O jogo só conversa com este módulo; trocar de portal não mexe no código do jogo.
//
// Escolha da plataforma (nesta ordem):
//   1. window.PLATAFORMA definido antes de carregar o jogo ('poki' | 'crazygames' | 'nenhuma')
//   2. parâmetro de URL ?plataforma=poki
//   3. domínio (crazygames.* ou poki.*)

const SDKS = {
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
};

function detecta() {
  if (window.PLATAFORMA) return window.PLATAFORMA;
  const p = new URLSearchParams(location.search).get('plataforma');
  if (p) return p;
  const h = location.hostname + ' ' + document.referrer;
  if (/crazygames/i.test(h)) return 'crazygames';
  if (/poki/i.test(h)) return 'poki';
  return 'nenhuma';
}

function carregaScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => erro(new Error('SDK não carregou: ' + src));
    document.head.appendChild(s);
  });
}

const somHooks = { pausar: () => {}, voltar: () => {} };
let nome = 'nenhuma';
let pronto = false;
let jogando = false;

const poki = () => window.PokiSDK;
const crazy = () => window.CrazyGames && window.CrazyGames.SDK;

export const Plataforma = {
  get nome() { return nome; },

  /** Liga a plataforma. Nunca trava o jogo: se o SDK falhar, segue sem anúncios. */
  async iniciar() {
    nome = detecta();
    try {
      if (nome === 'poki') { await carregaScript(SDKS.poki); await poki().init(); }
      else if (nome === 'crazygames') { await carregaScript(SDKS.crazygames); await crazy().init(); }
      pronto = true;
    } catch (e) {
      console.warn('[plataforma] seguindo sem SDK:', e.message);
      nome = 'nenhuma';
    }
    return nome;
  },

  /** Funções que o jogo usa para silenciar e devolver o som durante anúncios. */
  aoAnuncio(pausar, voltar) { somHooks.pausar = pausar; somHooks.voltar = voltar; },

  carregamentoInicio() {
    if (nome === 'crazygames' && pronto) crazy().game.loadingStart();
  },
  carregamentoFim() {
    if (nome === 'poki' && pronto) poki().gameLoadingFinished();
    if (nome === 'crazygames' && pronto) crazy().game.loadingStop();
  },

  /** Chamar quando o jogador começa a jogar de fato (e ao voltar de pausa/menu). */
  jogoInicio() {
    if (jogando) return; jogando = true;
    if (nome === 'poki' && pronto) poki().gameplayStart();
    if (nome === 'crazygames' && pronto) crazy().game.gameplayStart();
  },
  /** Chamar em pausa, morte, menu, cutscene longa e tela final. */
  jogoPausa() {
    if (!jogando) return; jogando = false;
    if (nome === 'poki' && pronto) poki().gameplayStop();
    if (nome === 'crazygames' && pronto) crazy().game.gameplayStop();
  },

  /** Momento de alegria (chefe derrotado, recorde). Só a CrazyGames usa. */
  festa() {
    if (nome === 'crazygames' && pronto) crazy().game.happytime();
  },

  /** Anúncio entre partidas (ex.: antes de "jogar de novo"). Sempre resolve. */
  intervalo() {
    if (!pronto || nome === 'nenhuma') return Promise.resolve();
    this.jogoPausa();
    if (nome === 'poki') {
      return poki().commercialBreak(() => somHooks.pausar())
        .catch(() => {}).finally(() => somHooks.voltar());
    }
    return new Promise((ok) => {
      const fim = () => { somHooks.voltar(); ok(); };
      crazy().ad.requestAd('midgame', { adStarted: () => somHooks.pausar(), adFinished: fim, adError: fim });
    });
  },

  /** Anúncio com recompensa (ex.: reviver). Resolve true se o jogador ganhou o prêmio. */
  recompensa() {
    if (!pronto || nome === 'nenhuma') return Promise.resolve(false);
    this.jogoPausa();
    if (nome === 'poki') {
      return poki().rewardedBreak(() => somHooks.pausar())
        .then((ok) => !!ok).catch(() => false).finally(() => somHooks.voltar());
    }
    return new Promise((ok) => {
      crazy().ad.requestAd('rewarded', {
        adStarted: () => somHooks.pausar(),
        adFinished: () => { somHooks.voltar(); ok(true); },
        adError: () => { somHooks.voltar(); ok(false); },
      });
    });
  },

  /** Salvamento local seguro (funciona mesmo com armazenamento bloqueado). */
  salvar(chave, valor) {
    try { localStorage.setItem('fdj:' + chave, JSON.stringify(valor)); } catch (e) {}
  },
  ler(chave, padrao = null) {
    try { const v = localStorage.getItem('fdj:' + chave); return v == null ? padrao : JSON.parse(v); }
    catch (e) { return padrao; }
  },
};
