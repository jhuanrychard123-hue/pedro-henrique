Vozes da Terra — Protótipo simples

Protótipo estático para fins educativos e demonstração. Inclui:
- `index.html` — página principal com mapa, galeria e mini-quiz
- `styles.css` — estilos básicos
- `script.js` — lógica do mapa e interações
- `data.json` — dados de exemplo de 5 povos

Como rodar localmente

1. No diretório raiz do repositório execute:

```bash
python3 -m http.server 8000 --directory site
```

2. Abra `http://localhost:8000` no navegador.

Observações e ética
- As imagens e textos são exemplos; antes de publicar é essencial obter autorização das comunidades e usar imagens com licenças adequadas.
- Projetos reais devem incluir créditos culturais e consultar representantes das comunidades.

Licença: CC0 (protótipo)."

Imagens locais e créditos
Este protótipo usa imagens locais geradas como placeholders dentro da pasta `site/img/` para evitar dependência de rede durante demonstrações. Cada imagem no `data.json` inclui um campo `caption` e `credit` — antes de publicar substitua por imagens com permissão e créditos reais.

Melhorias nesta versão
- Paleta de cores expandida e elementos visuais sutis
- Melhorias de acessibilidade: link de pular conteúdo, foco por teclado, live region para notificações

Deploy (GitHub Pages)

1. Confirme que você quer que eu commite e publique no GitHub Pages. Preciso de permissão para commitar no repositório ou você pode criar uma branch e abrir um PR.
2. Passos manuais se preferir fazer você mesmo:

```bash
git add site
git commit -m "Protótipo: Vozes da Terra — melhorias visuais e acessibilidade"
git push origin main
# Habilite GitHub Pages nas configurações do repositório (branch: main / folder: /site ou usar root)
```

Observação: antes do deploy público, revise licenças de imagens e obtenha autorizações necessárias.