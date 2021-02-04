/* global tmi */

const MAX_BROOMS_PER_USER = 3;
let isGameRunning = true;
let hasRaceStarted = false;
let hasWon = null;
let sortIntoA = false;
let RACERS = {
  a: {
    brooms: 0,
    users: []
  },
  b: {
    brooms: 0,
    users: []
  }
};

const params = new URLSearchParams(document.location.search.substring(1));
const options = {
  channel: params.get("channel")
};

const client = new tmi.Client({
  connection: { reconnect: true },
  channels: [options.channel]
});

client.connect();

function addUserToGroup(user) {
  if (sortIntoA) {
    RACERS.a.users.push(user);
    sortIntoA = false;
  } else {
    RACERS.b.users.push(user);
    sortIntoA = true;
  }
}

const aElement = document.querySelector(".a");
const aUsersElement = aElement.querySelector(".a__users");
const bElement = document.querySelector(".b");
const bUsersElement = bElement.querySelector(".b__users");
const winnerMessageElement = document.querySelector(".winner-message");
const playMessageElement = document.querySelector(".play-message");
const timerElement = document.querySelector(".timer");
const broomMessageElement = document.querySelector(".broom-message");

const waitingMusic = new Audio(
  "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2FMain%20Menu%20-%20Mario%20Kart%20Wii%20(320%20kbps).mp3?v=1612464293455"
);
const racingMusic = new Audio(
  "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2FRainbow%20Road%20-%20Mario%20Kart%20Wii%20(320%20kbps).mp3?v=1612464295863"
);
const countdownSound = new Audio(
  "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2Fbroomyjag-countdown.mp3?v=1612464308398"
);
const idlingCarsSound = new Audio(
  "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2Fbroomyjag-idle-care-noise.mp3?v=1612464308794"
);
const finishSound = new Audio(
  "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2FFinished%20Race%20(First%20Place)%20-%20Mario%20Kart%20Wii%20(320%20kbps).mp3?v=1612464846813"
);
waitingMusic.preload = true;
racingMusic.preload = true;
countdownSound.preload = true;
idlingCarsSound.preload = true;
finishSound.preload = true;

waitingMusic.loop = true;
idlingCarsSound.loop = true;
racingMusic.loop = true;
waitingMusic.volume = 0.4;
racingMusic.volume = 0.4;
finishSound.volume = 0.4;

idlingCarsSound.play();
waitingMusic.play();

function updateGame() {
  aUsersElement.innerHTML = "";
  RACERS.a.users.forEach((user, i) => {
    const listElement = document.createElement("li");
    listElement.style.color = user.color;
    listElement.style.left = `${3 * i}em`;
    listElement.innerText = user.username;
    aUsersElement.appendChild(listElement);
  });

  bUsersElement.innerHTML = "";
  RACERS.b.users.forEach((user, i) => {
    const listElement = document.createElement("li");
    listElement.style.color = user.color;
    listElement.style.left = `${3 * i}em`;
    listElement.innerText = user.username;
    bUsersElement.appendChild(listElement);
  });

  const aPercentage = (RACERS.a.brooms / maxBroomsPerGroups("a")) * 75;
  aElement.style.transform = `translateX(${aPercentage}vw)`;

  const bPercentage = (RACERS.b.brooms / maxBroomsPerGroups("b")) * 75;
  bElement.style.transform = `translateX(${bPercentage}vw)`;

  if (hasWon) {
    broomMessageElement.style.opacity = 0;

    console.log(`${hasWon} won!`);
    winnerMessageElement.style.opacity = 1;
    winnerMessageElement.style.border = `10px solid ${
      hasWon === "a" ? "red" : "blue"
    }`;
    winnerMessageElement.innerText = `${
      hasWon === "a" ? "Red" : "Blue"
    } broomy wins!`;
    setTimeout(() => {
      document.body.style.opacity = 0;
    }, 7 * 1000);
  }
}

function maxBroomsPerGroups(groupType) {
  return MAX_BROOMS_PER_USER * RACERS[groupType].users.length;
}

function handleWinner(groupType) {
  console.log(RACERS[groupType].brooms, maxBroomsPerGroups(groupType));
  if (RACERS[groupType].brooms === maxBroomsPerGroups(groupType)) {
    racingMusic.pause();
    finishSound.play();
    hasWon = groupType;
    hasRaceStarted = false;
    isGameRunning = false;
    updateGame();
  }
}

function startRace() {
  countdownSound.play();
  playMessageElement.style.opacity = 0;
  broomMessageElement.style.opacity = 1;
  timerElement.style.opacity = 1;
  
  let timer = 3;
  timerElement.className = `timer timer--${timer}`;
  timerElement.innerText = timer;
  const interval = setInterval(() => {
    timer -= 1;
    timerElement.innerText = timer;
    timerElement.className = `timer timer--${timer}`;
    if (timer === 0) {
      timerElement.innerText = "go";
      timerElement.className = `timer timer--go`;
      hasRaceStarted = true;
      updateGame();
      clearInterval(interval);
      idlingCarsSound.pause();
      waitingMusic.pause();
      racingMusic.play();
      setTimeout(() => {
        timerElement.style.opacity = 0;
        timerElement.innerText = "";
        timerElement.className = `timer`;
      }, 1000);
    }
  }, 1000);
}

client.on("message", (channel, tags, message) => {
  const command = message.trim().toLowerCase();
  const user = {
    color: tags.color,
    username: tags["display-name"]
  };
  const isStreamer = tags?.badges?.broadcaster === "1";
  const isAGroupUser = RACERS.a.users.find(u => u.username === user.username);
  const isBGroupUser = RACERS.b.users.find(u => u.username === user.username);

  if (isGameRunning) {
    if (isStreamer && command === "!start") {
      console.log("!start: race starting");
      startRace();
    }

    if (!hasRaceStarted && command.includes("!play")) {
      if (isAGroupUser || isBGroupUser) {
        return;
      }
      
      console.log(`!play: ${user.username}`);
      const helloSound = new Audio(
        "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2Fbroomyjag-hello.mp3?v=1612464833787"
      );
      helloSound.volume = 1;
      helloSound.play();
      addUserToGroup(user);
    }

    if (hasRaceStarted && command.includes("!br")) {
      if (isAGroupUser || isBGroupUser) {
        const broomSound = new Audio(
          "https://cdn.glitch.com/7c708f6f-1851-45a5-b230-513d8c268d85%2Fbroomyjag-broom.mp3?v=1612464833942"
        );
        broomSound.play();
      }

      if (isAGroupUser) {
        console.log(`!broom: ${user.username} (A)`);
        RACERS.a.brooms += 1;
        handleWinner("a");
      }

      if (isBGroupUser) {
        console.log(`!broom: ${user.username} (B)`);
        RACERS.b.brooms += 1;
        handleWinner("b");
      }
    }
  }

  console.log(RACERS);
  updateGame();
});

playMessageElement.style.opacity = 1;
console.log(RACERS);
updateGame();
