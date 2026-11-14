# Fábrica de Jogos

Jogos completos feitos pelo Ben com o Claude. Um jogo por pasta.

- `motor/` — motor-base reaproveitável (Three.js): câmera, entrada, combate, interface, diálogos, cutscenes, áudio, salvamento.
- `jogos/<nome>/` — cada jogo.

Jogo nº 1: A Cripta (Valdreinor).

## Estrutura atual
- `motor/plataforma.js` — camada única para Poki, CrazyGames ou nenhuma (itch.io/Vercel): carregamento, início/pausa de jogo, anúncios entre partidas e com recompensa, salvamento seguro.
- `motor/vendor/three/` — Three.js r170 servido localmente (os portais não gostam de CDN externo).
- `jogos/a-cripta/` — jogo nº 1. Modelos KayKit (CC0) otimizados com gltf-transform (resample + dedup + meshopt): de 10 MB para 3,7 MB.

## Rodar no computador
Na pasta do repositório: `python -m http.server 8000` e abrir `http://localhost:8000/jogos/a-cripta/`.
Testar como portal: acrescente `?plataforma=poki` ou `?plataforma=crazygames` ao endereço.
