// ===== MAPPA: ingrediente → stagioni =====
// Nota: uso le radici delle parole (es. "limon", "aranc") cosi il match
// funziona sia col singolare che col plurale (limone/limoni, arancia/arance).
const stagionalitaIngredienti = {
  fragole: ['primavera'],
  ciliegie: ['primavera', 'estate'],
  albicocche: ['estate'],
  pesche: ['estate'],
  lamponi: ['estate'],
  mirtilli: ['estate'],
  'frutti di bosco': ['estate'],
  lime: ['estate'],
  mango: ['estate', 'autunno'],
  pere: ['autunno', 'inverno'],
  mele: ['autunno', 'inverno'],
  castagne: ['autunno'],
  aranc: ['inverno'],
  limon: ['inverno'],
  banan: ['tutto l\'anno'],
};


// ===== FUNZIONE: deduci stagionalità dagli ingredienti =====
function deduciStagionalita(ingredients) {
  const stagioni = new Set();
  for (const ingrediente of ingredients) {
    const testo = ingrediente.toLowerCase();
    for (const [frutto, stagioniFrutto] of Object.entries(stagionalitaIngredienti)) {
      if (testo.includes(frutto)) {
        stagioniFrutto.forEach(s => stagioni.add(s));
      }
    }
  }
  return [...stagioni];
}


module.exports = { deduciStagionalita };