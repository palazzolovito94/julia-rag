// ===== IMPORT E CONFIGURAZIONE =====
const fs = require('fs');

const OLLAMA_URL = 'http://localhost:11434/api/embeddings';


// ===== FUNZIONE: ottieni embedding da Ollama =====
async function getEmbedding(testo) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: testo
    })
  });
  const data = await response.json();
  return data.embedding;
}


// ===== FUNZIONE: similarità coseno tra due vettori =====
function cosineSimilarity(a, b) {
  let prodottoScalare = 0;
  let lunghezzaA = 0;
  let lunghezzaB = 0;

  for (let i = 0; i < a.length; i++) {
    prodottoScalare += a[i] * b[i];
    lunghezzaA += a[i] * a[i];
    lunghezzaB += b[i] * b[i];
  }

  return prodottoScalare / (Math.sqrt(lunghezzaA) * Math.sqrt(lunghezzaB));
}


// ===== FUNZIONE PRINCIPALE: cerca ricette =====
async function main() {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.log('Uso: node search.js <la tua domanda>');
    return;
  }

  const recipes = JSON.parse(fs.readFileSync('embeddings.json', 'utf-8'));
  const queryEmbedding = await getEmbedding(query);

  const risultati = recipes.map(recipe => ({
    name: recipe.name,
    score: cosineSimilarity(queryEmbedding, recipe.embedding)
  }));

  risultati.sort((a, b) => b.score - a.score);

  console.log('\nRisultati per:', query, '\n');
  for (const r of risultati.slice(0, 5)) {
    console.log(r.score.toFixed(3), '-', r.name);
  }
}

main();