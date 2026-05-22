# Sistema de Compras 4.0

Aplicacao web para criar, organizar e acompanhar listas de compras. O sistema funciona como uma PWA, salva os dados no proprio navegador com `localStorage`, permite registrar precos durante a compra e exporta listas em JSON, PDF ou WhatsApp.

## Visao geral

O projeto e um front-end estatico feito com HTML, CSS e JavaScript puro. Nao possui backend, banco de dados externo, processo de build ou instalacao de dependencias locais.

Principais recursos:

- Criacao e gerenciamento de multiplas listas de compras.
- Adicao de itens com nome, marca, quantidade e sugestoes de itens frequentes.
- Marcacao de itens comprados com registro de preco e calculo automatico do total.
- Busca, filtros por status e ordenacao alfabetica.
- Edicao, duplicacao e exclusao de listas e itens.
- Historico das compras finalizadas.
- Estatisticas mensais com total gasto e media por compra.
- Exportacao de listas para JSON e PDF.
- Compartilhamento via WhatsApp.
- Funcionamento offline apos o primeiro carregamento, usando Service Worker.
- Interface responsiva com foco em uso mobile.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Tailwind CSS via CDN
- Font Awesome via CDN
- Google Fonts
- jsPDF via CDN
- Web App Manifest
- Service Worker
- LocalStorage

## Estrutura do projeto

```text
.
├── index.html          # Tela principal do sistema
├── introducao.html     # Pagina de apresentacao e guia de uso
├── script.js           # Regras de negocio, estado, eventos e persistencia
├── manifest.json       # Configuracao da PWA
├── sw.js               # Service Worker para cache/offline
└── compras (6).zip     # Arquivo compactado com uma versao do projeto
```

## Como executar

Como o projeto e estatico, voce pode abrir o arquivo `index.html` diretamente no navegador.

Para testar a PWA e o Service Worker corretamente, e melhor servir os arquivos por HTTP. Uma opcao simples e usar:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Tambem e possivel abrir a pagina introdutoria:

```text
http://localhost:8000/introducao.html
```

## Como usar

1. Abra o sistema em `index.html`.
2. Crie uma nova lista em **Gerenciar**.
3. Adicione itens informando nome, marca opcional e quantidade.
4. Abra a lista para iniciar a compra.
5. Marque um item como comprado e informe o preco pago.
6. Acompanhe o progresso e o total automaticamente.
7. Finalize a compra para salvar no historico.
8. Exporte ou compartilhe o resultado quando necessario.

## Persistencia dos dados

Os dados sao salvos localmente no navegador usando `localStorage`.

Chaves utilizadas:

- `shoppingLists`: listas e itens cadastrados.
- `purchaseHistory`: historico de compras finalizadas.
- `frequentItems`: itens usados para sugestoes.
- `soundEnabled`: preferencia de som.

Como os dados ficam no dispositivo, eles nao sao sincronizados automaticamente entre navegadores ou celulares diferentes. Para transferir uma lista, use a exportacao em JSON e importe o arquivo no outro dispositivo.

## Importacao e exportacao

O sistema permite:

- Importar lista em JSON.
- Exportar lista em JSON para backup ou transferencia.
- Exportar lista em PDF com os itens e valores.
- Compartilhar resumo por WhatsApp.

O formato JSON exportado segue a estrutura:

```json
{
  "listName": "Minha Lista",
  "items": [
    {
      "name": "Arroz",
      "brand": "",
      "checked": false,
      "price": 0,
      "quantity": 2
    }
  ],
  "total": "0.00",
  "dateSaved": "2026-01-01T00:00:00.000Z"
}
```

## PWA e modo offline

O arquivo `manifest.json` define as informacoes da Progressive Web App, como nome, tema, orientacao e icone.

O arquivo `sw.js` faz cache dos principais arquivos do app e de alguns recursos externos. Apos o primeiro carregamento, o sistema pode continuar abrindo mesmo sem internet. Recursos carregados por CDN dependem de terem sido cacheados anteriormente.

## Observacoes importantes

- Nao ha autenticacao de usuarios.
- Nao ha banco de dados remoto.
- Os dados podem ser apagados se o usuario limpar os dados do navegador.
- A integracao com WhatsApp abre uma URL `wa.me` com o texto preenchido.
- O arquivo `compras (6).zip` parece ser um pacote antigo do projeto e nao e necessario para executar a aplicacao.

## Possiveis melhorias futuras

- Adicionar capturas de tela no README.
- Criar icones reais em arquivos separados para a PWA.
- Adicionar sincronizacao em nuvem.
- Criar testes automatizados para as regras de lista e exportacao.
- Separar CSS e JavaScript em modulos menores.
- Corrigir textos antigos com caracteres especiais, caso aparecam com codificacao incorreta em algum ambiente.

## Licenca

Este projeto ainda nao possui uma licenca definida. Antes de publicar no GitHub, adicione um arquivo `LICENSE` com a licenca desejada.
