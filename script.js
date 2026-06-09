let survivors = [];
let targetSurvivor = null;

// Load JSON data
fetch('survivors.json')
  .then(res => res.json())
  .then(data => {
    survivors = data;
    targetSurvivor = survivors[Math.floor(Math.random() * survivors.length)];
    populateDatalist();
  });

// Populate autocomplete
function populateDatalist() {
  const datalist = document.getElementById('survivor-list');
  survivors.forEach(s => {
    const option = document.createElement('option');
    option.value = s.name;
    datalist.appendChild(option);
  });
}

// Compare guess
function checkGuess(guessName) {
  const guess = survivors.find(s => s.name.toLowerCase() === guessName.toLowerCase());
  if (!guess) {
    alert('Survivor not found!');
    return;
  }

  const stats = ["strength","speed","stamina","luck","defense","agility","intelligence","charisma"];
  const row = document.createElement('div');
  row.className = 'row';

  stats.forEach(stat => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const guessedValue = guess[stat];
    const targetValue = targetSurvivor[stat];

    cell.textContent = guessedValue;

    if (guessedValue === targetValue) {
      cell.classList.add('correct');
    } else if (guessedValue < targetValue) {
      cell.classList.add('higher');
      cell.textContent += ' ▲';
    } else {
      cell.classList.add('lower');
      cell.textContent += ' ▼';
    }

    row.appendChild(cell);
  });

  document.getElementById('board').appendChild(row);
}

// Event listener
document.getElementById('guess-btn').addEventListener('click', () => {
  const input = document.getElementById('guess-input');
  const guess = input.value.trim();
  if (guess) {
    checkGuess(guess);
    input.value = '';
  }
});
