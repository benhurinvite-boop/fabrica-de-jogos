// Música procedural (sintetizada no navegador, zero arquivos): sequenciador com temas que
// trocam conforme a ação. Mixada baixa e com compressor para nunca estourar.
// Musica.iniciar(audioContext); Musica.tema('explorar'|'combate'|'chefe'|'menu'); Musica.jingle('vitoria'|'derrota')

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Acordes em MIDI (ré menor). Cada acorde dura 1 compasso de 16 passos.
const PROG_A = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]; // Dm Bb F C
const PROG_B = [[50, 53, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]]; // Dm C Bb A
// Melodias: [compasso, passo, nota, duração em passos]
const MEL_A = [[0,0,74,4],[0,4,77,2],[0,6,76,2],[0,8,74,4],[0,12,69,4],[1,0,70,4],[1,4,74,2],[1,6,72,2],[1,8,70,4],[1,12,65,4],
  [2,0,69,4],[2,4,72,2],[2,6,77,2],[2,8,76,4],[2,12,72,4],[3,0,76,3],[3,3,74,3],[3,6,72,2],[3,8,76,8]];
const MEL_B = [[0,0,74,2],[0,2,74,2],[0,4,77,2],[0,8,81,6],[1,0,79,2],[1,2,76,2],[1,4,72,4],[1,8,76,6],
  [2,0,77,2],[2,2,74,2],[2,4,70,4],[2,8,74,6],[3,0,73,4],[3,4,76,4],[3,8,69,8]];

const TEMAS = {
  menu:     { bpm: 84,  prog: PROG_A, mel: MEL_A, baixo: 1, pad: 1, arp: 0, bat: 0, melVol: .7 },
  explorar: { bpm: 96,  prog: PROG_A, mel: MEL_A, baixo: 1, pad: 1, arp: 1, bat: 0, melVol: .55 },
  combate:  { bpm: 128, prog: PROG_A, mel: MEL_A, baixo: 2, pad: 1, arp: 2, bat: 1, melVol: .6 },
  chefe:    { bpm: 140, prog: PROG_B, mel: MEL_B, baixo: 2, pad: 1, arp: 2, bat: 2, melVol: .7 },
};

let ac = null, bus = null, master = null, tid = null;
let atual = null, proxPasso = 0, passo = 0, ruidoBuf = null, volume = 1;

function nota(f, t, dur, tipo, vol, filtro) {
  const o = ac.createOscillator(); o.type = tipo; o.frequency.value = f;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let saida = o;
  if (filtro) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filtro; o.connect(fl); saida = fl; }
  saida.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function ruido(t, dur, vol, freq, tipo = 'highpass') {
  const s = ac.createBufferSource(); s.buffer = ruidoBuf;
  const f = ac.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function bumbo(t, vol) {
  const o = ac.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.25);
}

function tocaPasso(t) {
  const T = TEMAS[atual]; const s16 = 60 / T.bpm / 4;
  const compasso = Math.floor(passo / 16) % 4, p = passo % 16; const ac0 = T.prog[compasso];
  if (T.pad && p === 0) for (const m of ac0) { nota(hz(m), t, s16 * 16, 'triangle', 0.045, 1400); nota(hz(m) * 1.005, t, s16 * 16, 'sawtooth', 0.012, 900); }
  if (T.baixo === 1 && (p === 0 || p === 8)) nota(hz(ac0[0] - 12), t, s16 * 7, 'sawtooth', 0.09, 420);
  if (T.baixo === 2 && p % 2 === 0) nota(hz(ac0[0] - 12 + (p % 8 === 6 ? 7 : 0)), t, s16 * 1.8, 'sawtooth', 0.085, 520);
  if (T.arp) {
    const passoArp = T.arp === 2 ? 1 : 2;
    if (p % passoArp === 0) { const seq = [0, 1, 2, 1, 0, 2, 1, 2]; const k = (p / passoArp) % 8; const m = ac0[seq[k]] + 12 + (k >= 4 ? 12 : 0); nota(hz(m), t, s16 * 1.4, 'square', 0.022, 2600); }
  }
  for (const [c, ps, m, d] of T.mel) if (c === compasso && ps === p) {
    nota(hz(m), t, s16 * d * 0.95, 'triangle', 0.075 * T.melVol, 3200);
    nota(hz(m) * 2, t, s16 * d * 0.6, 'sine', 0.018 * T.melVol);
  }
  if (T.bat) {
    const kick = T.bat === 2 ? p % 4 === 0 : (p === 0 || p === 8 || p === 10);
    if (kick) bumbo(t, 0.32);
    if (p === 4 || p === 12) ruido(t, 0.16, 0.12, 1500, 'bandpass');
    if (p % 2 === 1 || T.bat === 2) ruido(t, 0.04, 0.035, 7000);
  }
}

function agenda() {
  if (!ac || !atual || ac.state !== 'running') return;
  const s16 = 60 / TEMAS[atual].bpm / 4;
  if (proxPasso < ac.currentTime - 0.2) proxPasso = ac.currentTime + 0.02; // voltou de pausa/anúncio: não despeja notas atrasadas
  while (proxPasso < ac.currentTime + 0.12) { tocaPasso(proxPasso); proxPasso += s16; passo++; }
}

export const Musica = {
  get atual() { return atual; },
  iniciar(contexto) {
    if (ac || !contexto) return; ac = contexto;
    master = ac.createGain(); master.gain.value = 0.0001;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 6;
    bus = ac.createGain(); bus.gain.value = 0.5; bus.connect(comp); comp.connect(master); master.connect(ac.destination);
    ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    tid = setInterval(agenda, 25);
  },
  tema(nome) {
    if (!ac || nome === atual || !TEMAS[nome]) return;
    const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(0.0001, t, 0.12);
    setTimeout(() => { atual = nome; passo = 0; proxPasso = ac.currentTime + 0.05; master.gain.setTargetAtTime(0.42 * volume, ac.currentTime, 0.25); }, atual ? 450 : 0);
  },
  parar() { if (!ac) return; master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.2); setTimeout(() => { atual = null; }, 500); },
  jingle(tipo) {
    if (!ac) return; this.parar(); const t = ac.currentTime + 0.5;
    const notas = tipo === 'vitoria' ? [62, 65, 69, 74, 77, 81] : [69, 65, 62, 57];
    notas.forEach((m, i) => { const g = ac.createGain(); g.gain.value = 0.9; g.connect(ac.destination);
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); const e = ac.createGain();
      const ti = t + i * (tipo === 'vitoria' ? 0.11 : 0.22); e.gain.setValueAtTime(0.0001, ti); e.gain.exponentialRampToValueAtTime(0.09, ti + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, ti + 0.7);
      o.connect(e); e.connect(g); o.start(ti); o.stop(ti + 0.75); });
  },
};
