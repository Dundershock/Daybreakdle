let survivors = [];
let targetSurvivor = null;
let gameOver = false;

const stats = [
  "speed",
  "stamina",
  "stealth",
  "composure",
  "repair",
  "healing",
  "skill",
  "technique"
];

const categories = ["class"];

async function loadData() {
  try {
    const response = await fetch("survivors.json");
    survivors = await response.json();

    if (!survivors.length) {
      throw new Error("No survivors found.");
    }

    // Random target for testing
    targetSurvivor =
      survivors[Math.floor(Math.random() * survivors.length)];

    console.log("Target Survivor:", targetSurvivor.name);

    populateDatalist();
    createHeader();
  } catch (error) {
    console.error(error);
    alert("Failed to load survivor data.");
  }
}

function populateDatalist() {
  const datalist = document.getElementById("survivor-list");
  datalist.innerHTML = "";

  survivors.forEach((survivor) => {
    const option = document.createElement("option");
    option.value = survivor.name;
    datalist.appendChild(option);
  });
}

function createHeader() {
  const board = document.getElementById("board");

  const header = document.createElement("div");
  header.className = "row";

  const nameCell = document.createElement("div");
  nameCell.className = "cell";
  nameCell.textContent = "Name";
  header.appendChild(nameCell);

  stats.forEach((stat) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent =
      stat.charAt(0).toUpperCase() + stat.slice(1);
    header.appendChild(cell);
  });

  categories.forEach((cat) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = cat;
    header.appendChild(cell);
  });

  board.appendChild(header);
}

function normalizeName(name) {
  return name.toLowerCase().trim();
}

function findSurvivor(name) {
  return survivors.find(
    survivor =>
      normalizeName(survivor.name) === normalizeName(name)
  );
}

function makeComparisonCell(guessValue, targetValue) {
  const cell = document.createElement("div");
  cell.className = "cell";

  if (guessValue === targetValue) {
    cell.classList.add("correct");
    cell.textContent = `${guessValue} ✓`;
  } else if (guessValue < targetValue) {
    cell.classList.add("higher");
    cell.textContent = `${guessValue} ▲`;
  } else {
    cell.classList.add("lower");
    cell.textContent = `${guessValue} ▼`;
  }

  return cell;
}

function checkGuess(guessName) {
  const guess = findSurvivor(guessName);

  if (!guess) {
    alert("Survivor not found.");
    return;
  }

  const board = document.getElementById("board");
  const row = document.createElement("div");
  row.className = "row";

  const nameCell = document.createElement("div");
  nameCell.className = "cell";
  nameCell.textContent = guess.name;
  row.appendChild(nameCell);

  let allCorrect = true;

  stats.forEach((stat) => {
    const guessValue = guess[stat];
    const targetValue = targetSurvivor[stat];

    if (guessValue !== targetValue) {
      allCorrect = false;
    }

    row.appendChild(
      makeComparisonCell(guessValue, targetValue)
    );
  });

  board.appendChild(row);

  categories.forEach((cat) => {
    const cell = document.createElement("div");
    cell.className = "cell";
  
    const guessedValue = guess[cat];
    const targetValue = targetSurvivor[cat];
  
    if (guessedValue === targetValue) {
      cell.classList.add("correct");
      cell.textContent = guessedValue + " ✓";
    } else {
      cell.classList.add("incorrect");
      cell.textContent = guessedValue + " ✗";
      allCorrect = false;
    }
  
    row.appendChild(cell);
  });
  
  if (allCorrect) {
    gameOver = true;
    setTimeout(() => {
      alert(`🎉 Correct! The survivor was ${targetSurvivor.name}!`);
    }, 100);
  }
}

function submitGuess() {
  if (gameOver) return; // disable input after win

  const input = document.getElementById("guess-input");
  const guessName = input.value;

  if (!guessName.trim()) return;

  checkGuess(guessName);
  input.value = "";
}

document
  .getElementById("guess-btn")
  .addEventListener("click", submitGuess);

document
  .getElementById("guess-input")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitGuess();
    }
  });

loadData();
