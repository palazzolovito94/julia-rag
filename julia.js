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

// ===== FUNZIONE: estrai gli ingredienti da escludere dalla query =====
function estraiEsclusioni(query) {
  const testo = query.toLowerCase();
  const ingredientiNoti = [
    'cioccolato', 'nocciole', 'noci', 'mandorle', 'arachidi',
    'uova', 'latte', 'burro', 'panna', 'cocco', 'caffè',
    'liquore', 'alcol', 'glutine', 'farina',
  ];
  const negazioni = ['senza', 'niente', 'no ', 'non '];

  const esclusi = [];
  for (const ingrediente of ingredientiNoti) {
    if (testo.includes(ingrediente)) {
      // controlla se compare una negazione prima dell'ingrediente
      const posizione = testo.indexOf(ingrediente);
      const testoPrima = testo.slice(0, posizione);
      const negato = negazioni.some(neg => testoPrima.includes(neg));
      if (negato) {
        esclusi.push(ingrediente);
      }
    }
  }
  return esclusi;
}

// ===== FUNZIONE: genera la risposta con llama3.2 =====
async function generaRisposta(query, ricetteTrovate) {
  let contesto = '';
  for (const r of ricetteTrovate) {
    contesto += `\n- ${r.name} (ingredienti: ${r.ingredients.join(', ')}; preparazione: ${r.prepTime}, cottura: ${r.cookTime})\n`;
  }

  const nomiAmmessi = ricetteTrovate.map(r => r.name).join(', ');

  const prompt = `Sei Julia, un'assistente esperta di dolci. Rispondi in modo amichevole ma sobrio e conciso.

REGOLE FERREE:
- Puoi nominare ESCLUSIVAMENTE queste ricette: ${nomiAmmessi}.
- Non inventare altre ricette e non proporre di modificare o sostituire ingredienti di una ricetta per adattarla (es. NON dire "usa la ricetta X e sostituisci Y").
- Proponi le ricette dell'elenco che più si avvicinano alla richiesta, anche se il nome non è identico a ciò che chiede l'utente.
- Solo se DAVVERO nessuna ricetta dell'elenco è pertinente, dillo in una frase e fermati.
- Usa i nomi esatti delle ricette, senza aggiungere prefissi come "Ricetta:".
- Non fingere di ricordare ricerche precedenti dell'utente.

RICETTE DISPONIBILI (le uniche che puoi nominare):
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
  const esclusi = estraiEsclusioni(query);

  if (stagioneRichiesta) console.log('[filtro stagione:', stagioneRichiesta + ']');
  if (tempoMax) console.log('[filtro tempo: max', tempoMax, 'minuti]');
  if (esclusi.length > 0) console.log('[esclusi:', esclusi.join(', ') + ']');

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

    // filtro esclusione: scarta ricette che contengono un ingrediente indesiderato
  if (esclusi.length > 0) {
    risultati = risultati.filter(r => {
      const ingredientiTesto = r.recipe.ingredients.join(' ').toLowerCase();
      // tieni la ricetta solo se NON contiene nessuno degli ingredienti esclusi
      return !esclusi.some(ing => ingredientiTesto.includes(ing));
    });
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