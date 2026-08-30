# Roadmap — Julia (ricostruzione tracciata)

Assistente RAG per ricette di dolci, ricostruito da zero con storia Git pulita.
Ogni tappa = un commit.

## Stack
- Node.js
- Ollama in locale: `nomic-embed-text` (embedding) + `llama3.2:3b` (generazione)
- Dati: ricette dolci da GialloZafferano

## Tappe

- [x] 0. Setup: Node, .gitignore, README, repo su GitHub
- [ ] 1. Scraper (`scraper.js`) → raccoglie le ricette in `recipes.json`
       URL categoria Dolci-e-Desserts, selettore basato sull'href, parsing JSON-LD
- [ ] 2. Stagionalita (`seasonality.js`) → deduce le stagioni dagli ingredienti
- [ ] 3. Embeddings (`embed.js`) → testo ricette → vettori con nomic-embed-text
- [ ] 4. Ricerca semantica (`search.js`) → similarita coseno query/ricette
- [ ] 5. RAG ibrido (`julia.js`) → filtri (stagione + tempo) + generazione con llama3.2
       Guardia anti-allucinazione: prompt severo + stop su zero risultati
- [ ] 6. Interfaccia web → server Express + pagina HTML

## Concetto chiave
L'IA non e "addestrata" sulle ricette: i dati restano nei file e vengono
recuperati e passati al modello al momento della domanda (Retrieval-Augmented
Generation). Aggiungere ricette non richiede ri-addestramento.
