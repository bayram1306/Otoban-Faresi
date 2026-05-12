var pX, lane = 1;
var obs = [], cns = [], mons = [], mags = [], scn = [], gCoins = [], finishLine = null;
var score = 0, coinsCount = 1, state = "MENU", spd = 5.5, magT = 0, autoT = 0;
var level = 1, baseTarget = 15, magSpawned = false, autoSpawned = false;
var highScore = 0, showNextLevel = false, paused = false;
var maxLevels = 1000;

var totalGold = 0, currentSessionGold = 0;
var carColor = [0, 120, 255]; 
var magPower = 600, autoPower = 600; 
var hasExtraLife = false; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  pX = width / 2;
}

function draw() {
  background(130, 190, 230);
  drawEnvironment();  
  
  if (state === "MENU") drawMainMenu();
  else if (state === "PLAY") {
    if (!paused) runGame();
    else drawPauseMenu();
  }
  else if (state === "SHOP") drawShop();
  else if (state === "SCOREBOARD") drawScoreBoard();
}

function drawEnvironment() {
  // Çimler
  fill(34, 139, 34);
  rect(0, 0, width * 0.1, height); 
  rect(width * 0.9, 0, width * 0.1, height);
  
  // Yol
  fill(50, 50, 50);
  let roadWidth = width * 0.8;
  let roadX = width * 0.1;
  rect(roadX, 0, roadWidth, height); 

  // Kesik Yol Çizgileri
  stroke(255, 40); 
  strokeWeight(width * 0.01);
  let lOff = (frameCount * spd) % 60;
  for (let y = -60; y < height; y += 60) {
    line(roadX + roadWidth * 0.33, y + lOff, roadX + roadWidth * 0.33, y + lOff + 30);
    line(roadX + roadWidth * 0.66, y + lOff, roadX + roadWidth * 0.66, y + lOff + 30);
  }
  noStroke();
}

function runGame() {
  let currentTarget = level * baseTarget;
  let currentProgress = coinsCount - 1;
  let roadWidth = width * 0.8;
  let roadX = width * 0.1;

  if (autoT > 0) {
    autoT--;
    let laneScores = [0, 0, 0]; 
    let hazards = [...obs, ...mons]; 
    for (let h of hazards) {
      let hL = floor((h.x - roadX) / (roadWidth / 3));
      let distY = abs(h.y - (height - 150));
      if (h.y > -150 && h.y < height) laneScores[hL] -= (500000 / (distY + 1)); 
    }
    let rewards = [...cns, ...gCoins, ...mags];
    for (let r of rewards) {
      let rL = floor((r.x - roadX) / (roadWidth / 3));
      let distY = abs(r.y - (height - 150));
      laneScores[rL] += (2000 - distY);
    }
    let bestL = 0, maxS = -Infinity;
    for(let i=0; i<3; i++) { if(laneScores[i] > maxS) { maxS = laneScores[i]; bestL = i; } }
    lane = bestL;
  }

  pX = lerp(pX, roadX + (lane * (roadWidth / 3)) + (roadWidth / 6) - 25, 0.35);
  if (magT > 0) magT--;

  let spawnRate = max(10, 45 - (level * 2));
  if (frameCount % spawnRate === 0 && !finishLine) {
    let l = floor(random(3));
    let x = roadX + (l * (roadWidth / 3)) + (roadWidth / 6) - 20;
    
    if (currentProgress >= currentTarget) {
      finishLine = { y: -100 };
    } else if (!magSpawned && currentProgress >= floor(currentTarget / 3)) {
      mags.push({x: x, y: -50});
      magSpawned = true;
    } else if (!autoSpawned && currentProgress >= floor(currentTarget / 2)) {
      gCoins.push({x: x, y: -50});
      autoSpawned = true;
    } else {
      let r = random();
      if (r < 0.35) {
        let cols = ["#FF0000", "#9400D3", "#8B4513"];
        mons.push({x: x, y: -50, col: random(cols)}); 
      }
      else if (r < 0.55) obs.push({x:x, y:-50});
      else cns.push({x:x, y:-50});
    }
  }

  if (finishLine) {
    finishLine.y += spd;
    drawFinishLine(finishLine.y);
    if (finishLine.y > height - 100) { levelComplete(); return; }
  }

  handle(cns, "GOLD"); handle(gCoins, "GREEN"); handle(mags, "MAG");
  handle(obs, "RED"); handle(mons, "MONSTER"); 

  drawDetailedCar(pX, height - 150);
  drawUI(currentTarget, currentProgress);
}

function handle(list, type) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y += spd;
    if (type === "GOLD" && magT > 0) {
      let d = dist(list[i].x, list[i].y, pX, height - 150);
      if (d < 180) { list[i].x = lerp(list[i].x, pX + 5, 0.2); list[i].y = lerp(list[i].y, height - 140, 0.2); }
    }
    
    let col = (type === "MONSTER") ? (list[i].col || "#9400D3") : null;
    drawAsset(list[i].x, list[i].y, type, col);
    
    if (dist(list[i].x+20, list[i].y+20, pX+25, height-110) < 45) {
      if (type === "GOLD") { score += 10; currentSessionGold += 10; coinsCount++; sound(1000, 0.3); list.splice(i, 1); }
      else if (type === "MAG") { magT = magPower; sound(800, 0.3); list.splice(i, 1); }
      else if (type === "GREEN") { autoT = autoPower; sound(1200, 0.3); list.splice(i, 1); }
      else {
        if (hasExtraLife) { hasExtraLife = false; list.splice(i, 1); sound(200, 0.3); }
        else { gameOver(); return; }
      }
    } else if (list[i].y > height) list.splice(i, 1);
  }
}

function drawUI(target, progress) {
  fill(0, 150); rect(10, 10, 160, 85, 10);
  fill(255); textAlign(LEFT); textSize(12);
  text("BÖLÜM: " + level, 20, 30); 
  fill(255, 215, 0); text("HEDEF: " + target, 20, 52);
  fill(0, 255, 100); text("ALINAN: " + progress, 20, 74);
  
  if (magT > 0) { fill(0, 255, 255); text("🧲 " + ceil(magT/60) + "s", 20, 115); }
  if (autoT > 0) { fill(0, 255, 100); text("🤖 " + ceil(autoT/60) + "s", 95, 115); }
}

function drawAsset(x, y, type, col) { 
  push(); 
  translate(x + 20, y + 20); 
  if (type === "GOLD") { 
    fill(255, 215, 0); ellipse(0, 0, 25, 25); fill(0); textAlign(CENTER, CENTER); text("$", 0, 2); 
  } else if (type === "MAG") { 
    stroke(255, 0, 0); strokeWeight(6); noFill(); arc(0, 0, 24, 24, PI, 0); 
  } else if (type === "GREEN") { 
    fill(0, 255, 100); ellipse(0, 0, 30, 30); fill(255); textSize(10); textAlign(CENTER); text("AUTO", 0, 5); 
  } else if (type === "RED") {
    fill(200, 0, 0); rect(-15, -15, 30, 30, 5);
  } else if (type === "MONSTER") { 
    fill(col); stroke(0); strokeWeight(2);
    ellipse(0, 0, 42, 42);
    fill(255); ellipse(-10, -5, 10, 10); ellipse(10, -5, 10, 10);
    fill(0); ellipse(-10, -5, 4); ellipse(10, -5, 4);
  } 
  pop(); 
}

function drawDetailedCar(x, y) {
  push();
  fill(carColor); rect(x, y, 50, 85, 8);
  fill(40, 120, 200, 220); rect(x+5, y+10, 40, 18, 2);
  fill(255, 255, 200); ellipse(x+10, y+5, 12, 6); ellipse(x+40, y+5, 12, 6);
  if (hasExtraLife) { noFill(); stroke(255, 0, 0); strokeWeight(3); ellipse(x+25, y+42, 70); }
  pop();
}

function levelComplete() { totalGold += currentSessionGold; currentSessionGold = 0; if (level < maxLevels) { level++; spd += 0.5; state = "MENU"; showNextLevel = true; clearStage(); sound(1500, 0.4); } else { state = "SCOREBOARD"; } }
function gameOver() { if (score > highScore) highScore = score; state = "MENU"; showNextLevel = false; fullReset(); sound(200, 0.5); }

function drawMainMenu() { 
  fill(0, 180); rect(width*0.1, height*0.1, width*0.8, height*0.8, 30); 
  fill(255); textAlign(CENTER); textSize(width*0.08); text("OTOBAN FARESİ", width/2, height*0.2); 
  fill(255, 215, 0); textSize(20); text("KASA: " + totalGold + " $", width/2, height*0.25); 
  drawMenuButton(showNextLevel ? "SIRADAKİ BÖLÜM" : "GAZA BAS", height*0.4); 
  drawMenuButton("MARKET", height*0.5); 
  drawMenuButton("REKORLAR", height*0.6); 
}

function drawMenuButton(label, y) { 
  let h = mouseIn(width*0.2, width*0.8, y-25, y+25); 
  fill(h ? 255 : 200, 100); 
  rect(width*0.2, y-25, width*0.6, 50, 10); 
  fill(255); textAlign(CENTER); text(label, width/2, y+7); 
}

function mouseIn(x1, x2, y1, y2) { return mouseX > x1 && mouseX < x2 && mouseY > y1 && mouseY < y2; }
function mousePressed() { 
  if (state === "MENU") { 
    if (mouseIn(width*0.2, width*0.8, height*0.4-25, height*0.4+25)) { if (showNextLevel) { state = "PLAY"; showNextLevel = false; } else { fullReset(); state = "PLAY"; } }
    if (mouseIn(width*0.2, width*0.8, height*0.5-25, height*0.5+25)) state = "SHOP"; 
    if (mouseIn(width*0.2, width*0.8, height*0.6-25, height*0.6+25)) state = "SCOREBOARD"; 
  } else if (state === "PLAY") { 
    lane = mouseX < width/3 ? 0 : (mouseX < width*0.66 ? 1 : 2); 
  } else state = "MENU"; 
}

function sound(f, a) { let osc = new p5.Oscillator('sine'); osc.start(); osc.freq(f); osc.amp(a, 0); osc.amp(0, 0.2); setTimeout(() => osc.stop(), 200); }
function clearStage() { obs = []; mons = []; cns = []; mags = []; gCoins = []; magT = 0; autoT = 0; magSpawned = false; autoSpawned = false; finishLine = null; coinsCount = 1; }
function fullReset() { clearStage(); score = 0; level = 1; spd = 5.5; currentSessionGold = 0; }
function drawFinishLine(y) { fill(255); rect(width*0.1, y, width*0.8, 20); }

function drawShop() { fill(0, 240); rect(0, 0, width, height); fill(255, 215, 0); textAlign(CENTER); text("MARKET", width/2, 50); text("GERİ DÖN", width/2, height-50); }
function drawScoreBoard() { fill(0, 180); rect(0, 0, width, height); fill(255, 215, 0); textAlign(CENTER); text("REKOR: " + highScore, width/2, height/2); }
