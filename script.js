// State
let survivors = [];
let targetSurvivor = null;
let gameOver = false;
let guessCount = 0;
let gameMode = localStorage.getItem("gameMode") || "daily";

// Audio
const sounds = {
  reveal: new Audio("assets/sounds/Reveal.mp3"),
  guess:  new Audio("assets/sounds/LockIn.mp3"),
  win:    new Audio("assets/sounds/WinSound.mp3"),
};

function playSound(name) {
  if (name === "reveal") {
    sounds.reveal.cloneNode().play().catch(() => {});
  } else {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
  }
}

// Schema
const columns = [
  { key: "speed",     type: "stat" },
  { key: "stamina",   type: "stat" },
  { key: "stealth",   type: "stat" },
  { key: "composure", type: "stat" },
  { key: "repair",    type: "stat" },
  { key: "healing",   type: "stat" },
  { key: "skill",     type: "stat" },
  { key: "technique", type: "stat" },
  { key: "class",     type: "category" },
];

const guessedNames = new Set();

// Utilities
function formatLabel(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeName(name) {
  return name.toLowerCase().trim();
}

function findSurvivor(name) {
  return survivors.find(s => normalizeName(s.name) === normalizeName(name));
}

function randomizeBackground() {
  const backgrounds = [
    "assets/images/ClearwaterBG.jpg",
    "assets/images/CostaBG.webp",
    "assets/images/GaikharaBG.webp",
    "assets/images/EmpireBG.webp",
    "assets/images/DawnwoodBG.webp",
  ];
  document.body.style.backgroundImage =
    `url("${backgrounds[Math.floor(Math.random() * backgrounds.length)]}")`;
}

// Daily helpers
function getDailySurvivor() {
  const startDate = new Date(Date.UTC(2025, 0, 1));
  const today = new Date();
  const currentUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const daysSinceStart = Math.floor((currentUTC - startDate) / 86_400_000);
  return survivors[daysSinceStart % survivors.length];
}

function getDailyKey() {
  const t = new Date();
  return `daybreakdle-${t.getUTCFullYear()}-${t.getUTCMonth() + 1}-${t.getUTCDate()}`;
}

function getDailyGuessesKey() {
  return `${getDailyKey()}-guesses`;
}

function isDailyComplete() {
  return localStorage.getItem(getDailyKey()) === "completed";
}

function cleanupOldDailyKeys() {
  const todayKey = getDailyKey();
  Object.keys(localStorage)
    .filter(k => k.startsWith("daybreakdle-") && k !== "daybreakdle-stats" && !k.startsWith(todayKey))
    .forEach(k => localStorage.removeItem(k));
}

function markDailyComplete() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem("daybreakdle-stats")) || { completed: 0, lastCompletedDate: null };
  if (saved.lastCompletedDate === today) return;
  saved.completed += 1;
  saved.lastCompletedDate = today;
  localStorage.setItem("daybreakdle-stats", JSON.stringify(saved));
  localStorage.setItem(getDailyKey(), "completed"); // ← the missing line
}

// UI updates
function updateModeButtons() {
  document.getElementById("daily-btn").classList.toggle("current-mode", gameMode === "daily");
  document.getElementById("freeplay-btn").classList.toggle("current-mode", gameMode === "freeplay");
}

function updateDailyTimer() {
  const timerEl = document.getElementById("daily-timer");
  if (gameMode !== "daily") { timerEl.textContent = ""; return; }
  const now = new Date();
  const nextUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = nextUTC - now;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  timerEl.textContent = `Next survivor in ${h}h ${m}m ${s}s`;
}

function updateDailyResult() {
  const resultEl = document.getElementById("daily-result");
  if (gameMode !== "daily") { resultEl.textContent = ""; return; }
  const saved = JSON.parse(localStorage.getItem("daybreakdle-stats")) || { completed: 0 };
  resultEl.innerHTML = `🏆 Daily wins: <b>${saved.completed}</b> | Current guesses: <b>${guessCount}</b>`;
}

function updateDailyUI() {
  const isComplete = gameMode === "daily" && isDailyComplete();
  document.querySelector(".autocomplete-container").classList.toggle("hidden", isComplete);
  document.getElementById("guess-btn").classList.toggle("hidden", isComplete);
}

function updateAllUI() {
  updateDailyTimer();
  updateDailyResult();
  updateDailyUI();
  updateModeButtons();
}

// Board
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

function clearBoard() {
  document.getElementById("board").innerHTML = "";
  createHeader();
}

// Autocompleting survivor searches
function updateSuggestions() {
  const input = document.getElementById("guess-input").value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";
  if (!input) return;

  const matches = survivors
    .filter(s => s.name.toLowerCase().includes(input) && !guessedNames.has(s.name.toLowerCase()))
    .sort((a, b) => b.name.toLowerCase().startsWith(input) - a.name.toLowerCase().startsWith(input));

  matches.forEach(survivor => {
    const li = document.createElement("li");
    li.className = "suggestion-item";

    const img = document.createElement("img");
    img.src = `assets/faces/${survivor.image}`;
    img.alt = survivor.name;
    img.className = "suggestion-image";

    const span = document.createElement("span");
    span.textContent = survivor.name;

    li.append(img, span);
    li.addEventListener("click", () => {
      document.getElementById("guess-input").value = survivor.name;
      suggestions.innerHTML = "";
    });
    suggestions.appendChild(li);
  });
}

function clearSuggestions() {
  const suggestions = document.getElementById("suggestions");
  if (suggestions) suggestions.innerHTML = "";
}

// Game logic
function checkGuess(guessName, isRestoring = false) {
  const guess = findSurvivor(guessName);
  if (!guess) { alert("Survivor not found."); return; }

  if (!isRestoring && guessedNames.has(guess.name.toLowerCase())) {
    alert("You already guessed that survivor!");
    return;
  }

  const board = document.getElementById("board");
  const row = document.createElement("div");
  row.className = isRestoring ? "row" : "row new-row";

  // Name cell with portrait
  const nameCell = document.createElement("div");
  nameCell.className = "cell name-cell";
  const portrait = document.createElement("img");
  portrait.src = `assets/faces/${guess.image}`;
  portrait.alt = guess.name;
  const nameText = document.createElement("span");
  nameText.textContent = guess.name;
  nameCell.append(portrait, nameText);
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
      } else {
        const isHigher = guessValue < targetValue;
        cell.classList.add(isHigher ? "higher" : "lower");
        cell.textContent = `${guessValue} ${isHigher ? "▲" : "▼"}`;
        allCorrect = false;
      }
    } else {
      const classImg = document.createElement("img");
      classImg.src = `assets/classes/${formatLabel(guessValue)}.png`;
      const isCorrect = guessValue === targetValue;
      cell.classList.add(isCorrect ? "correct" : "incorrect");
      cell.append(classImg, ` ${formatLabel(guessValue)} ${isCorrect ? "✓" : "✗"}`);
      if (!isCorrect) allCorrect = false;
    }

    row.appendChild(cell);
  });

  guessedNames.add(guess.name.toLowerCase());

  if (!isRestoring) {
    guessCount++;

    if (gameMode === "daily") {
      const savedGuesses = JSON.parse(localStorage.getItem(getDailyGuessesKey())) || [];
      savedGuesses.push(guess.name);
      localStorage.setItem(getDailyGuessesKey(), JSON.stringify(savedGuesses));
      updateDailyResult();
    }

    // Staggered reveal sound — one tick per cell (10 cells total: name + 9 columns)
    [0, 150, 300, 450, 600, 750, 900, 1050, 1200, 1350].forEach(delay => {
      setTimeout(() => playSound("reveal"), delay);
    });
  }

  // Insert new row immediately after the header
  board.insertBefore(row, board.firstElementChild.nextSibling);

  updateSuggestions();

  if (allCorrect && !isRestoring) {
    gameOver = true;
    setTimeout(() => {
      if (gameMode === "daily") {
        markDailyComplete();
        updateDailyResult();
        updateDailyUI();
      }
      playSound("win");
      // BUG FIX: "1 guesses" → "1 guess"
      const guessWord = guessCount === 1 ? "guess" : "guesses";
      document.getElementById("win-text").innerHTML =
        `The survivor was <b>${targetSurvivor.name}</b>.<br>You got it in <b>${guessCount}</b> ${guessWord}!!`;
      document.getElementById("win-screen").classList.remove("hidden");
    }, 1350);
  }
}

function submitGuess() {
  if (gameOver) return;
  const input = document.getElementById("guess-input");
  const guessName = input.value.trim();
  if (!guessName) return; // check before playing sound
  playSound("guess");
  checkGuess(guessName);
  input.value = "";
  clearSuggestions();
}

function closeWinScreen() {
  document.getElementById("win-screen").classList.add("hidden");
}

// Mode switching 
function restoreDailyGame() {
  const savedGuesses = JSON.parse(localStorage.getItem(getDailyGuessesKey())) || [];
  guessCount = savedGuesses.length;
  savedGuesses.forEach(name => checkGuess(name, true));
  if (isDailyComplete()) gameOver = true;
  updateDailyResult();
  updateDailyUI();
}

function switchMode(mode) {
  const board = document.getElementById("board");
  board.classList.add("switching");

  setTimeout(() => {
    gameMode = mode;
    localStorage.setItem("gameMode", mode);
    gameOver = false;
    guessCount = 0;
    guessedNames.clear();
    clearBoard();
    clearSuggestions();
    document.getElementById("guess-input").value = "";

    if (mode === "daily") {
      targetSurvivor = getDailySurvivor();
      restoreDailyGame();
    } else {
      targetSurvivor = survivors[Math.floor(Math.random() * survivors.length)];
    }

    updateAllUI();
    board.classList.remove("switching");
    console.log("New target:", targetSurvivor?.name);
  }, 300);
}

// Init
async function loadData() {
  try {
    const response = await fetch("survivors.json");
    survivors = await response.json();
    if (!survivors.length) throw new Error("No survivors found.");

    targetSurvivor = gameMode === "daily"
      ? getDailySurvivor()
      : survivors[Math.floor(Math.random() * survivors.length)];

    createHeader();

    if (gameMode === "daily") {
      restoreDailyGame();
      if (isDailyComplete()) { gameOver = true; return; }
    }

    console.log("Target Survivor:", targetSurvivor.name);
  } catch (error) {
    console.error(error);
    alert("Failed to load survivor data.");
  }
}

// Event listeners
document.getElementById("guess-btn").addEventListener("click", submitGuess);

const guessInput = document.getElementById("guess-input");
guessInput.addEventListener("keydown", e => { if (e.key === "Enter") submitGuess(); });
guessInput.addEventListener("input", updateSuggestions);
guessInput.addEventListener("focus", updateSuggestions);
guessInput.addEventListener("blur", () => setTimeout(clearSuggestions, 150));

document.getElementById("daily-btn").addEventListener("click", () => switchMode("daily"));
document.getElementById("freeplay-btn").addEventListener("click", () => switchMode("freeplay"));

window.addEventListener("load", () => document.getElementById("page").classList.add("loaded"));

// Startup
randomizeBackground();
cleanupOldDailyKeys();
loadData();
updateModeButtons();
setInterval(updateDailyTimer, 1000);
updateDailyTimer();
