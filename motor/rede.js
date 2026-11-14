// Co-op online: salas por código, até 4 jogadores, conexão direta entre aparelhos (WebRTC).
// Usa a biblioteca de rede do Poki (@poki/netlib, licença ISC): sinalização e servidores
// STUN/TURN hospedados de graça pelo Poki. Mensagens em JSON: { t: tipo, d: dados }.
//
// await Rede.criar() -> código   |  await Rede.entrar('ABCD')
// Rede.on('tipo', (dados, deQuem) => {})   |  Rede.enviar('tipo', dados, { para, rapido })
import { Network } from './vendor/netlib.js';

const ID_JOGO = 'b7a3c1e2-5f4d-4a8e-9c21-6d0f3e8a7b55'; // identificador próprio da Fábrica (qualquer UUID vale)
let net = null;
const ouvintes = {};
const avisa = (t, d, de) => (ouvintes[t] || []).forEach((f) => { try { f(d, de); } catch (e) { console.error(e); } });

// Modo teste (?rede=teste): conecta abas do mesmo navegador sem internet, para testes automáticos.
function redeTeste() {
  const bc = new BroadcastChannel('fdj-rede-teste'); const id = 'p' + Math.random().toString(36).slice(2, 8); const peers = new Map(); let sala = null;
  const fala = (m) => bc.postMessage({ ...m, de: id, sala });
  bc.onmessage = ({ data: m }) => {
    if (m.de === id || m.sala !== sala || (m.para && m.para !== id)) return;
    if (m.k === 'oi' || m.k === 'oi2') { if (!peers.has(m.de)) { peers.set(m.de, { id: m.de }); avisa('$entrou', null, m.de); } if (m.k === 'oi') fala({ k: 'oi2', para: m.de, lider: Rede.lider }); else if (m.lider) Rede.lider = m.lider; return; }
    if (m.k === 'msg') { let x; try { x = JSON.parse(m.s); } catch (e) { return; } avisa(x.t, x.d, m.de); }
  };
  return { id, peers, on() {}, create: async () => { sala = 'T' + Math.floor(1000 + Math.random() * 9000); return sala; },
    join: async (c) => { sala = c; fala({ k: 'oi' }); await new Promise((r) => setTimeout(r, 300)); return { code: c, leader: Rede.lider }; },
    send: (canal, para, s2) => fala({ k: 'msg', para, s: s2 }), broadcast: (canal, s2) => fala({ k: 'msg', s: s2 }), leave: async () => {} };
}

function prepara() {
  if (net) return Promise.resolve();
  if (/[?&]rede=teste/.test(location.search)) { net = redeTeste(); return Promise.resolve(); }
  net = new Network(ID_JOGO);
  net.on('message', (peer, canal, dados) => {
    if (typeof dados !== 'string') return;
    let m; try { m = JSON.parse(dados); } catch (e) { return; }
    avisa(m.t, m.d, peer.id);
  });
  net.on('connected', (p) => avisa('$entrou', null, p.id));
  net.on('disconnected', (p) => avisa('$saiu', null, p.id));
  net.on('leader', (id) => { Rede.lider = id; avisa('$lider', id); });
  net.on('failed', () => avisa('$erro', 'failed'));
  net.on('signalingerror', (e) => avisa('$erro', String(e && e.message || e)));
  return new Promise((ok, erro) => {
    const t = setTimeout(() => erro(new Error('sem conexão com o servidor de salas')), 12000);
    net.on('ready', () => { clearTimeout(t); ok(); });
  });
}

export const Rede = {
  ativo: false, host: false, codigo: null, lider: null,
  get id() { return net ? net.id : 'local'; },
  get pares() { return net ? [...net.peers.keys()] : []; },

  async criar() {
    await prepara();
    this.codigo = await net.create({ maxPlayers: 4, codeFormat: 'short', public: false });
    this.ativo = true; this.host = true; this.lider = net.id; return this.codigo;
  },
  async entrar(codigo) {
    await prepara();
    const info = await net.join(String(codigo).trim());
    if (!info) throw new Error('sala não encontrada');
    this.codigo = info.code; this.ativo = true; this.host = false; this.lider = info.leader || null; return info;
  },
  on(tipo, f) { (ouvintes[tipo] = ouvintes[tipo] || []).push(f); },
  /** para: id de um jogador (senão vai para todos). rapido: canal sem garantia (posições). */
  enviar(tipo, d, { para = null, rapido = false } = {}) {
    if (!net || !this.ativo) return;
    const s = JSON.stringify({ t: tipo, d }); const canal = rapido ? 'unreliable' : 'reliable';
    try { if (para) net.send(canal, para, s); else net.broadcast(canal, s); } catch (e) { /* par ainda conectando */ }
  },
  async sair() { if (net) { try { await net.leave(); } catch (e) {} } this.ativo = false; this.host = false; this.codigo = null; },
};
