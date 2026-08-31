const input = document.getElementById('domanda');
const bottone = document.getElementById('invia');
const rispostaDiv = document.getElementById('risposta');

async function chiedi() {
  const domanda = input.value.trim();
  if (!domanda) return;

  // mostra stato di caricamento
  rispostaDiv.classList.add('visibile');
  rispostaDiv.innerHTML = '<span class="loading">Julia sta pensando...</span>';
  bottone.disabled = true;

  try {
    const response = await fetch('/api/chiedi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domanda: domanda })
    });
    const data = await response.json();
    rispostaDiv.textContent = data.risposta || data.errore;
  } catch (error) {
    rispostaDiv.textContent = 'Errore di connessione con Julia.';
  }

  bottone.disabled = false;
}

bottone.addEventListener('click', chiedi);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') chiedi();
});