// Áudios gravados (vozes, efeitos). Baixa os arquivos cedo e decodifica quando o som é liberado
// pelo primeiro toque do jogador. Passa por um compressor para nunca estourar.
// Sons.carregar('assets/vozes/', ['capitao_fala_1', ...]); Sons.iniciar(audioContext); Sons.tocar('capitao_risada')
const brutos = {}; const prontos = {}; let ac = null, bus = null, base = '', ext = '.mp3';

function decodifica(nome) {
  if (prontos[nome] || !ac || !brutos[nome]) return prontos[nome];
  prontos[nome] = brutos[nome].then((b) => ac.decodeAudioData(b.slice(0))).catch(() => null);
  return prontos[nome];
}

export const Sons = {
  carregar(pasta, nomes, extensao = '.mp3') {
    base = pasta; ext = extensao;
    for (const n of nomes) brutos[n] = fetch(base + n + ext).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).catch(() => null);
  },
  iniciar(contexto) {
    if (ac || !contexto) return; ac = contexto;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    bus = ac.createGain(); bus.gain.value = 0.85; bus.connect(comp); comp.connect(ac.destination);
    Object.keys(brutos).forEach(decodifica);
  },
  /** Toca um áudio. Retorna true se existia (para o jogo usar o som sintetizado como reserva). */
  tocar(nome, vol = 1) {
    if (!ac || !brutos[nome]) return false;
    decodifica(nome).then((buf) => {
      if (!buf) return; const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = 0.96 + Math.random() * 0.08;
      const g = ac.createGain(); g.gain.value = vol; s.connect(g); g.connect(bus); s.start();
    });
    return true;
  },
  aleatorio(nomes, vol) { return this.tocar(nomes[Math.floor(Math.random() * nomes.length)], vol); },
};
