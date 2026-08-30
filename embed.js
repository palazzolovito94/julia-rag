// ===== IMPORT E CONFIGURAZIONE =====
const fs = require('fs');
const { deduciStagionalita } = require('./seasonality');

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


// ===== FUNZIONE PRINCIPALE: elabora tutte le ricette =====
async function main() {
  const recipes = JSON.parse(fs.readFileSync('recipes.json', 'utf-8'));
  const risultato = [];

  for (const recipe of recipes) {
    const testo = recipe.name + '. Ingredienti: ' + recipe.ingredients.join(', ');
    console.log('Elaboro:', recipe.name);
    const embedding = await getEmbedding(testo);
    const seasonality = deduciStagionalita(recipe.ingredients);
    risultato.push({ ...recipe, seasonality, embedding });
  }

  fs.writeFileSync('embeddings.json', JSON.stringify(risultato, null, 2));
  console.log('Fatto! Salvate', risultato.length, 'ricette con embedding.');
}

main();