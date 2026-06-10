let survivors = [];
let targetSurvivor = null;
let gameOver = false;
let guessCount = 0;

const revealSound = new Audio("assets/sounds/Reveal.mp3");
const guessSound = new Audio("assets/sounds/LockIn.mp3");

function randomizeBackground() {
  const backgrounds = [
    "assets/images/ClearwaterBG.jpg",
    "assets/images/CostaBG.jpg",
    "assets/images/GaikharaBG.jpg",
    "assets/images/EmpireBG.jpg",
    "assets/images/DawnwoodBG.jpg"
  ];

  const randomBg =
    backgrounds[Math.floor(Math.random() * backgrounds.length)];

  document.body.style.backgroundImage = `url("${randomBg}")`;
}

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

const columns = [
  ...stats.map(stat => ({ key: stat, type: "stat" })),
  ...categories.map(cat => ({ key: cat, type: "category" }))
];

const guessedNames = new Set();

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

    createHeader();
  } catch (error) {
    console.error(error);
    alert("Failed to load survivor data.");
  }
}

function formatLabel(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function createHeader() {
  const board = document.getElementById("board");

  const header = document.createElement("div");
  header.className = "row";

  const nameCell = document.createElement("div");
  nameCell.className = "cell";
  nameCell.textContent = "Name";
  header.appendChild(nameCell);

  columns.forEach(({ key }) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = formatLabel(key);
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

function updateSuggestions() {
  const input =
    document.getElementById("guess-input").value.toLowerCase();

  const suggestions =
    document.getElementById("suggestions");

  suggestions.innerHTML = "";

  if (!input) return;

  const matches = survivors.filter(
    survivor =>
      survivor.name.toLowerCase().includes(input) &&
      !guessedNames.has(
        survivor.name.toLowerCase()
      )
  );

  matches.forEach((survivor) => {
  const li = document.createElement("li");
  li.className = "suggestion-item";

  const img = document.createElement("img");
  img.src = "assets/faces/" + survivor.image;
  img.alt = survivor.name;
  img.className = "suggestion-image";

  const span = document.createElement("span");
  span.textContent = survivor.name;

  li.appendChild(img);
  li.appendChild(span);

  li.addEventListener("click", () => {
    document.getElementById("guess-input").value =
      survivor.name;

    suggestions.innerHTML = "";
  });

  suggestions.appendChild(li);
});
}

function clearSuggestions() {
  const suggestions =
    document.getElementById("suggestions");

  if (suggestions) {
    suggestions.innerHTML = "";
  }
}

function checkGuess(guessName) {
  const guess = findSurvivor(guessName);

  if (!guess) {
    alert("Survivor not found.");
    return;
  }

  // Ignore duplicate guesses
  if (guessedNames.has(guess.name.toLowerCase())) {
    alert("you already guessed that survivor bruh");
    return;
  }

  const board = document.getElementById("board");
  const row = document.createElement("div");
  row.className = "row";
  row.classList.add("new-row");

  // Names with faces
  const nameCell = document.createElement("div");
  nameCell.className = "cell name-cell";
  
  const portrait = document.createElement("img");
  portrait.src = "assets/faces/" + guess.image;
  portrait.alt = guess.name;
  
  const nameText = document.createElement("span");
  nameText.textContent = guess.name;
  
  nameCell.appendChild(portrait);
  nameCell.appendChild(nameText);
  
  row.appendChild(nameCell);

  let allCorrect = true;

  columns.forEach(({ key, type }) => {
    const guessValue = guess[key];
    const targetValue = targetSurvivor[key];

    const cell = document.createElement("div");
    cell.className = "cell";

    if (type === "stat") {
      if (guessValue === targetValue) {
        cell.classList.add("correct");
        cell.textContent = `${guessValue} ✓`;
      } else if (guessValue < targetValue) {
        cell.classList.add("higher");
        cell.textContent = `${guessValue} ▲`;
        allCorrect = false;
      } else {
        cell.classList.add("lower");
        cell.textContent = `${guessValue} ▼`;
        allCorrect = false;
      }
    } else {
      const classImg = document.createElement("img");
      classImg.src = `assets/classes/${formatLabel(guessValue)}.png`;
    
      if (guessValue === targetValue) {
        cell.classList.add("correct");
        cell.appendChild(classImg);
        cell.appendChild(document.createTextNode(` ${formatLabel(guessValue)} ✓`));
      } else {
        cell.classList.add("incorrect");
        cell.appendChild(classImg);
        cell.appendChild(document.createTextNode(` ${formatLabel(guessValue)} ✗`));
        allCorrect = false;
      }
    }

    row.appendChild(cell);
  });

  guessedNames.add(
    guess.name.toLowerCase()
  );
  guessCount++;
  
  const header = board.firstElementChild;

  if (header && header.nextSibling) {
    board.insertBefore(row, header.nextSibling);
  } else {
    board.appendChild(row);
  }

  const revealDelays = [
    0, 150, 300, 450, 600,
    750, 900, 1050, 1200, 1350
  ];
  
  revealDelays.forEach(delay => {
    setTimeout(() => {
      revealSound.cloneNode().play();
    }, delay);
  });
  
  updateSuggestions();

  if (allCorrect) {
    gameOver = true;

    setTimeout(() => {
      document.getElementById("win-text").innerHTML =
        `The survivor was <b>${targetSurvivor.name}</b>.<br>You got it in <b>${guessCount}</b> guesses!!`;
    
      document.getElementById("win-screen").classList.remove("hidden");
    }, 1350);
  }
}

function submitGuess() {
  if (gameOver) return;

  guessSound.currentTime = 0;
  guessSound.play();

  const input =
    document.getElementById("guess-input");

  const guessName = input.value;

  if (!guessName.trim()) return;

  checkGuess(guessName);

  input.value = "";

  clearSuggestions();
}

function closeWinScreen() {
  document.getElementById("win-screen").classList.add("hidden");
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

document
  .getElementById("guess-input")
  .addEventListener("input", updateSuggestions);

document
  .getElementById("guess-input")
  .addEventListener("focus", updateSuggestions);

document
  .getElementById("guess-input")
  .addEventListener("blur", () => {
    setTimeout(clearSuggestions, 150);
  });

/* Page load animation */
window.addEventListener("load", () => {
  document.getElementById("page").classList.add("loaded");
});

randomizeBackground();
loadData();
