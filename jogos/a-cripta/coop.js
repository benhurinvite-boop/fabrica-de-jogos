// Co-op de Gorrath's Crypt (até 4). O anfitrião simula o mundo (inimigos, chefes, exércitos);
// cada jogador simula só o próprio herói. Saque e XP são individuais (cada um recebe o seu).
import { Rede } from '../../motor/rede.js';

const CORES = [0x5ad8ff, 0x7dff6a, 0xff6ad5, 0xffb84a];

export function criaCoop(ctx) {
  const { THREE, scene, tr, $ } = ctx;
  const OUTROS = new Map(); // id -> { b, alvo, rot, anim, vivo, bonus, cor, disco, criando }
  const BONECOS = new Map(); // aliados recebidos do anfitrião: id -> { b, alvo, rot }
  let tEu = 0, tMundo = 0, partidaComecou = false;

  const C = {
    get ativo() { return Rede.ativo; },
    get host() { return !Rede.ativo || Rede.host; },
    get cliente() { return Rede.ativo && !Rede.host; },
    get meuId() { return Rede.ativo ? Rede.id : 'local'; },
    get n() { return 1 + OUTROS.size; },
    OUTROS,

    /** Heróis vivos para a IA dos inimigos (só faz sentido no anfitrião). */
    herois() {
      const l = []; const h = ctx.heroi();
      if (h && !ctx.morto()) l.push({ id: 'local', pos: h.obj.position, ferir: (d) => ctx.feriHeroi(d) });
      for (const [id, o] of OUTROS) if (o.b && o.vivo) l.push({ id, pos: o.b.obj.position, ferir: (d) => Rede.enviar('dano', { d: Math.round(d) }, { para: id }) });
      return l;
    },
    posicoes() { return this.herois().map((h) => h.pos); },
    posDe(dono) { if (dono === 'local' || !Rede.ativo) return ctx.heroi() && ctx.heroi().obj.position; const o = OUTROS.get(dono); return o && o.b ? o.b.obj.position : (ctx.heroi() && ctx.heroi().obj.position); },
    bonusDe(dono) { if (dono === 'local') return ctx.BONUS; const o = OUTROS.get(dono); return (o && o.bonus) || {}; },

    /** Cliente: um golpe no inimigo vira pedido ao anfitrião. */
    golpe(e, d, o) { const de = ctx.heroi().obj.position; Rede.enviar('golpe', { i: e.id, d, kb: o.kb || 0, g: o.gelo ? 1 : 0, x: +de.x.toFixed(2), z: +de.z.toFixed(2) }); },
    evento(t, d) { if (Rede.ativo && Rede.host) Rede.enviar(t, d); },

    atualiza(dt) {
      if (!Rede.ativo || !partidaComecou) return;
      const h = ctx.heroi(); tEu += dt; tMundo += dt;
      if (h && tEu > 1 / 15) { tEu = 0; const B = ctx.BONUS; const E = ctx.ESTADO;
        Rede.enviar('eu', { x: +h.obj.position.x.toFixed(2), z: +h.obj.position.z.toFixed(2), r: +h.obj.rotation.y.toFixed(2), a: h.nome, v: !ctx.morto(), c: E.classe, cor: E.cor, cab: E.cab, capa: E.capa,
          b: { exercito: B.exercito, aliadoVida: B.aliadoVida, aliadoDano: B.aliadoDano, explosivo: B.explosivo, vel: B.vel } }, { rapido: true }); }
      if (Rede.host && tMundo > 1 / 12) { tMundo = 0;
        const ini = ctx.inimigos.filter((e) => e.estado !== 'morto').map((e) => [e.id, +e.b.obj.position.x.toFixed(2), +e.b.obj.position.z.toFixed(2), +e.b.obj.rotation.y.toFixed(2), e.b.nome, Math.max(0, Math.round(e.hp)), e.estado === 'dormindo' ? 0 : 1]);
        Rede.enviar('mundo', { i: ini, a: ctx.Exercito.retrato() }, { rapido: true }); }
      // suaviza bonecos dos outros jogadores e dos aliados recebidos
      for (const o of OUTROS.values()) if (o.b) { o.b.mixer.update(dt); o.b.obj.position.lerp(o.alvo, Math.min(1, dt * 12)); o.b.obj.rotation.y += difAng(o.rot, o.b.obj.rotation.y) * Math.min(1, dt * 12); o.disco.position.set(o.b.obj.position.x, .04, o.b.obj.position.z); }
      for (const p of BONECOS.values()) { p.b.mixer.update(dt); p.b.obj.position.lerp(p.alvo, Math.min(1, dt * 10)); p.b.obj.rotation.y += difAng(p.rot, p.b.obj.rotation.y) * Math.min(1, dt * 10); }
      if (this.cliente) for (const e of ctx.inimigos) if (e.alvoRede && e.estado !== 'morto') { e.b.obj.position.lerp(e.alvoRede, Math.min(1, dt * 10)); e.b.obj.rotation.y += difAng(e.rotRede, e.b.obj.rotation.y) * Math.min(1, dt * 10); }
    },
    comecou() { partidaComecou = true; },
  };

  function difAng(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  async function criaOutro(id, m) {
    const o = OUTROS.get(id); o.criando = true;
    const cl = ctx.CLASSES[m.c] || ctx.CLASSES[0];
    const b = await ctx.criaBoneco(cl.k, 'M'); await ctx.armar(b, cl.arma); ctx.visualDe(b, m.c, m.cor, m.cab, m.capa);
    b.obj.position.set(m.x, 0, m.z); scene.add(b.obj);
    const cor = CORES[(1 + [...OUTROS.keys()].indexOf(id)) % CORES.length];
    const disco = new THREE.Mesh(new THREE.RingGeometry(.55, .75, 24), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: .7, depthWrite: false }));
    disco.rotation.x = -Math.PI / 2; scene.add(disco);
    Object.assign(o, { b, disco, cor, criando: false });
  }

  async function criaBonecoAliado(id, arq) {
    BONECOS.set(id, { criando: true });
    const b = await ctx.criaBoneco(arq, 'M'); ctx.Exercito.tinge(b); scene.add(b.obj);
    const p = BONECOS.get(id); if (!p) { scene.remove(b.obj); return; }
    Object.assign(p, { b, alvo: new THREE.Vector3(), rot: 0, criando: false });
  }

  // ---------- mensagens ----------
  Rede.on('eu', (m, de) => {
    let o = OUTROS.get(de); if (!o) { o = { alvo: new THREE.Vector3(m.x, 0, m.z), rot: m.r, vivo: true }; OUTROS.set(de, o); }
    o.alvo.set(m.x, 0, m.z); o.rot = m.r; o.vivo = m.v; o.bonus = m.b;
    if (!o.b && !o.criando && partidaComecou) criaOutro(de, m);
    if (o.b && m.a && o.b.nome !== m.a) ctx.toca(o.b, m.a, { vez: /Attack|Shoot|Release|Spell|Raise|Dodge|Death|Chop|Spin/.test(m.a) });
    ctx.aoMudarJogadores();
  });
  Rede.on('mundo', (m) => {
    if (!C.cliente) return;
    for (const [id, x, z, r, a, hp, ativo] of m.i) {
      const e = ctx.inimigos.find((q) => q.id === id); if (!e || e.estado === 'morto') continue;
      if (!e.alvoRede) { e.alvoRede = new THREE.Vector3(x, 0, z); e.rotRede = r; }
      e.alvoRede.set(x, 0, z); e.rotRede = r; e.hp = hp;
      if (ativo && !e.b.obj.visible) { e.b.obj.visible = true; e.b.obj.position.set(x, 0, z); e.estado = 'caçando'; }
      if (a && e.b.nome !== a) ctx.toca(e.b, a, { vez: /Attack|Shoot|Awaken|Hit|Death|Chop|Slice/.test(a) });
      if (e.T.chefe && ativo) { $('chefe').style.display = 'block'; $('chefe').querySelector('i').style.transform = `scaleX(${Math.max(0, Math.min(1, hp / e.max))})`; }
    }
    const vistos = new Set(); let meus = 0;
    for (const [id, dono, arq, x, z, r, a] of m.a) {
      vistos.add(id); if (dono === Rede.id) meus++;
      let p = BONECOS.get(id); if (!p) { criaBonecoAliado(id, arq); continue; } if (p.criando) continue;
      p.alvo.set(x, 0, z); p.rot = r; if (a && p.b.nome !== a) ctx.toca(p.b, a, { vez: /Attack|Shoot|Awaken|Death|Chop|Slice/.test(a) });
    }
    for (const [id, p] of BONECOS) if (!vistos.has(id) && !p.criando) { if (p.b) { ctx.toca(p.b, 'Skeletons_Death', { vez: true }); const ob = p.b.obj; setTimeout(() => scene.remove(ob), 1500); } BONECOS.delete(id); }
    ctx.hudExer(meus, 3 + (ctx.BONUS.exercito || 0));
  });
  Rede.on('golpe', (m, de) => {
    if (!Rede.host) return; const e = ctx.inimigos.find((q) => q.id === m.i); if (!e || e.hp <= 0 || e.estado === 'dormindo') return;
    ctx.fere(e, m.d, { exato: true, kb: m.kb, gelo: !!m.g, de: new THREE.Vector3(m.x, 0, m.z), dono: de, remoto: true });
  });
  Rede.on('$saiu', (_, id) => {
    const o = OUTROS.get(id); if (o) { if (o.b) scene.remove(o.b.obj); if (o.disco) scene.remove(o.disco); OUTROS.delete(id); }
    if (partidaComecou) ctx.toast(tr(id === Rede.lider && !Rede.host ? 'coop.hostSaiu' : 'coop.saiu'), 'ruim');
    if (id === Rede.lider && !Rede.host && partidaComecou) setTimeout(() => ctx.fim(false), 1500);
    ctx.aoMudarJogadores();
  });
  Rede.on('$entrou', () => ctx.aoMudarJogadores());

  return C;
}
