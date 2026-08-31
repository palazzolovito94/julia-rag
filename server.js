// ===== IMPORT =====
const express = require('express');
const { chiediAJulia } = require('./julia');

const app = express();
const PORT = 3000;


// ===== MIDDLEWARE =====
app.use(express.json());        // per leggere il body JSON delle richieste
app.use(express.static('public')); // serve i file statici (index.html) dalla cartella public


// ===== ENDPOINT: ricevi una domanda e restituisci la risposta di Julia =====
app.post('/api/chiedi', async (req, res) => {
  const domanda = req.body.domanda;

  if (!domanda) {
    return res.status(400).json({ errore: 'Nessuna domanda ricevuta' });
  }

  try {
    const risposta = await chiediAJulia(domanda);
    res.json({ risposta });
  } catch (error) {
    console.log('Errore:', error.message);
    res.status(500).json({ errore: 'Errore nella generazione della risposta' });
  }
});


// ===== AVVIO SERVER =====
app.listen(PORT, () => {
  console.log(`Julia è in ascolto su http://localhost:${PORT}`);
});