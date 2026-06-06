# Exodus — Community Database

Página React (Vite) para navegar os itens do servidor Exodus (base v83):
busca por nome/ID, filtro por categoria, e página de item com **ícone + tabela de drop** (mob, %, taxa ~1/N, quantidade).

- **Dados:** `public/items_data.js` (`window.MAPLE_DATA`) — gerado a partir do `drop_data` do V83.
- **Ícones:** API pública `https://maplestory.io/api/GMS/83/item/<id>/icon`.

## Rodar local
```bash
npm install
npm run dev      # http://localhost:5173
```

## Build de produção
```bash
npm run build    # gera ./dist
npm run preview  # serve o ./dist localmente p/ conferir
```

## Deploy na Vercel

### Opção A — CLI (mais rápido)
```bash
npm i -g vercel        # se ainda não tiver
vercel                 # primeiro deploy (preview) — aceitar os defaults
vercel --prod          # publica em produção
```
A Vercel detecta o framework **Vite** automaticamente (build = `vite build`, output = `dist`).

### Opção B — Git + dashboard
1. `git init && git add . && git commit -m "exodus drops"` e suba pra um repositório (GitHub/GitLab).
2. Em vercel.com → **Add New → Project** → importe o repo.
3. Framework **Vite** é detectado sozinho. Clique em **Deploy**.

## Atualizar os dados
Os dados saem do `drop_data` do V83. Para regerar:
```bash
# na pasta do WZ/servidor 
python _build_item_data.py #(arquivo no repo)
# copie o resultado para este projeto:
copy items_data.js ..\exodus-drops\public\items_data.js
```

## Observações
- As % de drop são da baseline V83 (`drop_data.sql`). Se o servidor ao vivo editou drops, só o DB ao vivo refletiria.
- Itens muito custom do Exodus podem não ter ícone no maplestory.io → aparece um quadradinho "?".
