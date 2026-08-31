// ===== IMPORT E CONFIGURAZIONE =====
const fs = require('fs');

const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embeddings';
const OLLAMA_GEN_URL = 'http://localhost:11434/api/generate';


// ===== FUNZIONE: ottieni embedding da Ollama =====
async function getEmbedding(testo) {
  const response = await fetch(OLLAMA_EMBED_URL, {
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


// ===== FUNZIONE: estrai la stagione richiesta dalla query =====
function estraiStagione(query) {
  const testo = query.toLowerCase();
  const mappaStagioni = {
    primavera: ['primavera', 'primaverile'],
    estate: ['estate', 'estivo', 'estiva', 'fresco'],
    autunno: ['autunno', 'autunnale'],
    inverno: ['inverno', 'invernale'],
  };

  for (const [stagione, parole] of Object.entries(mappaStagioni)) {
    for (const parola of parole) {
      if (testo.includes(parola)) {
        return stagione;
      }
    }
  }
  return null;
}


// ===== FUNZIONE: converti durata ISO 8601 (es. "PT1H30M") in minuti =====
function durataInMinuti(durata) {
  if (!durata) return 0;
  const ore = durata.match(/(\d+)H/);
  const minuti = durata.match(/(\d+)M/);
  let totale = 0;
  if (ore) totale += parseInt(ore[1]) * 60;
  if (minuti) totale += parseInt(minuti[1]);
  return totale;
}


// ===== FUNZIONE: estrai il vincolo di tempo dalla query =====
function estraiTempoMax(query) {
  const testo = query.toLowerCase();
  const paroleVeloce = ['veloce', 'veloci', 'rapido', 'rapida', 'poco tempo', 'in fretta', 'sbrigativo'];
  for (const parola of paroleVeloce) {
    if (testo.includes(parola)) {
      return 30; // soglia in minuti di preparazione per "veloce"
    }
  }
  return null;
}


// ===== FUNZIONE: genera la risposta con llama3.2 =====
async function generaRisposta(query, ricetteTrovate) {
  let contesto = '';
  for (const r of ricetteTrovate) {
    contesto += `\nRicetta: ${r.name}\n`;
    contesto += `Ingredienti: ${r.ingredients.join(', ')}\n`;
    contesto += `Tempo preparazione: ${r.prepTime}, cottura: ${r.cookTime}\n`;
  }

  const prompt = `Sei Julia, un'assistente esperta di dolci e pasticceria. Rispondi alla domanda dell'utente in modo amichevole e discorsivo.

REGOLE IMPORTANTI:
- Puoi consigliare SOLO ricette presenti nell'elenco "RICETTE DISPONIBILI" qui sotto.
- Non inventare, non suggerire e non menzionare MAI ricette o preparazioni che non sono nell'elenco, nemmeno come idea extra o alternativa.
- Se l'utente vuole qualcosa che non è nell'elenco, dillo con onestà e fermati.
- Riferisciti alle ricette col loro nome esatto.

RICETTE DISPONIBILI:
${contesto}

DOMANDA UTENTE: ${query}

RISPOSTA:`;

  const response = await fetch(OLLAMA_GEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: prompt,
      stream: false,
      options: {
    temperature: 0.2
      }
    })
  });
  const data = await response.json();
  return data.response;
}


// ===== FUNZIONE RIUTILIZZABILE: il flusso RAG completo =====
async function chiediAJulia(query) {
  const recipes = JSON.parse(fs.readFileSync('embeddings.json', 'utf-8'));
  const queryEmbedding = await getEmbedding(query);
  const stagioneRichiesta = estraiStagione(query);
  const tempoMax = estraiTempoMax(query);

  let risultati = recipes.map(recipe => ({
    recipe: recipe,
    score: cosineSimilarity(queryEmbedding, recipe.embedding)
  }));

  if (stagioneRichiesta) {
    risultati = risultati.filter(r =>
      r.recipe.seasonality.length === 0 || r.recipe.seasonality.includes(stagioneRichiesta)
    );
  }

  if (tempoMax) {
    risultati = risultati.filter(r =>
      durataInMinuti(r.recipe.prepTime) <= tempoMax
    );
  }

  risultati.sort((a, b) => b.score - a.score);
  const top3 = risultati.slice(0, 3).map(r => r.recipe);

  // guardia anti-allucinazione
  if (top3.length === 0) {
    return 'Mi dispiace, nessuna ricetta nel mio ricettario soddisfa questi criteri. Prova ad allentare qualche vincolo (es. più tempo a disposizione o un\'altra stagione).';
  }

  const risposta = await generaRisposta(query, top3);
  return risposta;
}


// ===== USO DA TERMINALE =====
async function main() {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.log('Uso: node julia.js <la tua domanda>');
    return;
  }
  console.log('\nJulia sta pensando...\n');
  const risposta = await chiediAJulia(query);
  console.log(risposta);
}

// lancia main() solo se il file è eseguito direttamente (non se importato)
if (require.main === module) {
  main();
}


// ===== EXPORT: rende chiediAJulia disponibile ad altri file =====
module.exports = { chiediAJulia };