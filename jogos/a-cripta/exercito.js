// Exército de Ossos: a lanterna do Pip ergue os inimigos derrotados como aliados azuis.
// No co-op, quem simula todos os exércitos é o anfitrião; cada aliado tem um "dono" (o jogador que matou)
// e segue o herói dele. Os outros aparelhos só desenham os aliados recebidos (bonecos).
export function criaExercito(ctx) {
  const { THREE, scene, criaBoneco, armar, toca, move, explosao, particula, numero, som, inimigos, fere, projeteis, vira2, rand, tr } = ctx;
  const ALIADOS = []; let seq = 0;
  const tmp = new THREE.Vector3();
  const B = (dono) => ctx.bonusDe(dono);
  const max = (dono = 'local') => Math.min(12, 3 + (B(dono).exercito || 0));
  const doDono = (dono) => ALIADOS.filter((a) => a.dono === dono).length;

  function tinge(b) {
    b.obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material.color.setHex(0x8fc8ff); o.material.emissive.setHex(0x12357a); o.material.transparent = true; o.material.opacity = 0.92; } });
  }

  async function ergue(e, dono = 'local') {
    if (doDono(dono) >= max(dono) || e.T.chefe) return;
    const p = e.b.obj.position.clone(); const pip = ctx.pip();
    if (pip && dono === 'local') for (let i = 0; i < 10; i++) setTimeout(() => particula('magia', pip.clone().lerp(p.clone().setY(1), i / 10), new THREE.Vector3(0, .5, 0), .35, .4, 0), i * 40);
    await new Promise((r) => setTimeout(r, 700));
    if (doDono(dono) >= max(dono)) return;
    const T = e.T; const b = await criaBoneco(T.arq, 'M'); await armar(b, T.arma); tinge(b);
    b.obj.position.copy(p); scene.add(b.obj);
    toca(b, 'Skeletons_Awaken_Floor', { vez: true });
    explosao('magia', p.clone().setY(.4), 18, 3, .5, .6); som('magia');
    if (dono === 'local') numero(p.clone().setY(2.6), tr('ergueu'), 'x');
    const hp = Math.round(T.hp * .6 * (B(dono).aliadoVida || 1));
    const a = { id: ++seq, dono, b, T, hp, max: hp, estado: 'erguendo', t: 1.2, cdA: rand(.3, 1), alvo: null, slot: Math.random() * Math.PI * 2 };
    ALIADOS.push(a); ctx.aoMudar();
  }

  function ferir(a, d) {
    if (a.hp <= 0) return; a.hp -= d; numero(a.b.obj.position.clone().setY(2.4), Math.round(d), 'b');
    if (a.hp <= 0) morre(a);
  }

  function morre(a) {
    a.hp = 0; a.estado = 'morto'; const p = a.b.obj.position.clone();
    toca(a.b, 'Skeletons_Death', { vez: true }); explosao('magia', p.clone().setY(1), 16, 4, .45, .6); som('osso');
    if (B(a.dono).explosivo) { explosao('fogo', p.clone().setY(.5), 26, 6, .7, .6); som('boom'); for (const e of inimigos) if (e.hp > 0 && e.estado !== 'dormindo' && e.b.obj.position.distanceTo(p) < 3.2) fere(e, 40 * (B(a.dono).aliadoDano || 1), { kb: 5, de: p, dono: a.dono }); }
    setTimeout(() => scene.remove(a.b.obj), 1600);
    ALIADOS.splice(ALIADOS.indexOf(a), 1); ctx.aoMudar();
  }

  function inimigoPerto(pos, raio) {
    let m = null, md = raio;
    for (const e of inimigos) { if (e.hp <= 0 || e.estado === 'dormindo' || e.estado === 'despertando' || e.estado === 'morto') continue; const d = e.b.obj.position.distanceTo(pos); if (d < md) { md = d; m = e; } }
    return m;
  }

  function atualiza(dt, emCena) {
    ALIADOS.forEach((a, i) => {
      a.b.mixer.update(dt); if (emCena || a.estado === 'morto') return;
      if (a.estado === 'erguendo') { a.t -= dt; if (a.t <= 0) a.estado = 'livre'; return; }
      const hp = ctx.posDe(a.dono); if (!hp) return;
      const o = a.b.obj; a.cdA -= dt; const bd = B(a.dono).aliadoDano || 1;
      if (a.estado === 'atacando') { a.atT -= dt; if (!a.golpeou && a.atT < .35) { a.golpeou = true; if (a.alvo && a.alvo.hp > 0) {
          if (a.T.longe) { const ini = o.position.clone().setY(1.4); const dir = a.alvo.b.obj.position.clone().setY(1.3).sub(ini).normalize(); const s = particula('magia', ini, new THREE.Vector3(), 3, .5); projeteis.push({ s, p: ini, v: dir.multiplyScalar(13), dano: a.T.dano * 1.4 * bd, tipo: 'magia', vida: 1.2, amigo: true, dono: a.dono }); }
          else if (a.alvo.b.obj.position.distanceTo(o.position) < a.T.alc + 1.2) fere(a.alvo, a.T.dano * 1.4 * bd, { kb: 1.5, de: o.position, dono: a.dono }); } }
        if (a.atT <= 0) a.estado = 'livre'; return; }
      if (!a.alvo || a.alvo.hp <= 0 || a.alvo.estado === 'dormindo') a.alvo = inimigoPerto(o.position, 9) || inimigoPerto(hp, 9);
      const vel = (a.T.vel + .6) * (B(a.dono).vel || 1);
      if (a.alvo) {
        const ap = a.alvo.b.obj.position; const d = o.position.distanceTo(ap) - (a.alvo.T.chefe ? 1.2 : 0); vira2(o, ap);
        if (d <= a.T.alc && a.cdA <= 0) { a.estado = 'atacando'; a.golpeou = false; a.atT = .8; a.cdA = rand(.9, 1.4); toca(a.b, a.T.ataque, { vez: true, vel: 1.3 }); return; }
        if (d > a.T.alc * .85) { toca(a.b, 'Running_A', { vel: 1 }); tmp.copy(ap).sub(o.position).setY(0).normalize().multiplyScalar(vel * dt); move(o.position, tmp); }
        else toca(a.b, 'Skeletons_Idle');
      } else {
        const ang = a.slot + i * 0.9; const alvo = tmp.set(hp.x + Math.cos(ang) * 2.4, 0, hp.z + Math.sin(ang) * 2.4);
        const d = o.position.distanceTo(alvo);
        if (d > 8) o.position.copy(alvo);
        if (d > .9) { vira2(o, alvo); toca(a.b, d > 3 ? 'Running_A' : 'Skeletons_Walking', { vel: d > 3 ? 1 : 1.4 }); const dir = alvo.clone().sub(o.position).setY(0).normalize().multiplyScalar(Math.min(d, (d > 3 ? vel * 1.6 : vel) * dt)); move(o.position, dir); }
        else toca(a.b, 'Skeletons_Idle');
      }
    });
  }

  /** Para os inimigos: o alvo mais perto entre heróis vivos (de todos os jogadores) e aliados. */
  function alvoPara(pos) {
    let melhor = null, md = Infinity;
    for (const h of ctx.herois()) { const d = pos.distanceTo(h.pos); if (d < md) { md = d; melhor = { pos: h.pos, heroi: h, aliado: null }; } }
    for (const a of ALIADOS) { if (a.hp <= 0 || a.estado === 'erguendo') continue; const d = pos.distanceTo(a.b.obj.position) + 1.5; if (d < md) { md = d; melhor = { pos: a.b.obj.position, aliado: a, heroi: null }; } }
    return melhor;
  }

  function atingidoPor(p, raio = .9) { for (const a of ALIADOS) if (a.hp > 0 && a.b.obj.position.clone().setY(1.2).distanceTo(p) < raio) return a; return null; }

  /** Estado compacto para enviar aos outros aparelhos. */
  function retrato() { return ALIADOS.map((a) => [a.id, a.dono, a.T.arq, +a.b.obj.position.x.toFixed(2), +a.b.obj.position.z.toFixed(2), +a.b.obj.rotation.y.toFixed(2), a.b.nome]); }

  return { ALIADOS, ergue, ferir, atualiza, alvoPara, atingidoPor, max, doDono, retrato, tinge };
}
