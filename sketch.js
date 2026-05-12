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
  createCanvas(400, 600);
  pX = 200;
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
  fill(34, 139, 34); rect(0, 0, 50, height); rect(350, 0, 50, height);
  if (frameCount % 60 === 0) scn.push({x: random(5, 375), y: -50});
  for (let i = scn.length - 1; i >= 0; i--) {
    scn[i].y += spd;
    fill(255, 150); ellipse(scn[i].x, scn[i].y, 10, 10);
    if (scn[i].y > height) scn.splice(i, 1);
  }
  fill(50); rect(50, 0, 300, height);
  stroke(255, 40); strokeWeight(2);
  let lOff = (frameCount * spd) % 60;
  for (let y = -60; y < height; y += 60) {
    line(150, y + lOff, 150, y + lOff + 30);
    line(250, y + lOff, 250, y + lOff + 30);
  }
  noStroke();
}

function runGame() {
  let currentTarget = level * baseTarget;
  let currentProgress = coinsCount - 1;

  if (autoT > 0) {
    autoT--;
    let laneScores = [0, 0, 0]; 
    let hazards = [...obs, ...mons]; 
    for (let h of hazards) {
      let hL = floor((h.x - 50) / 100);
      let distY = abs(h.y - 500);
      if (h.y > -150 && h.y < 550) laneScores[hL] -= (500000 / (distY + 1)); 
    }
    let rewards = [...cns, ...gCoins, ...mags];
    for (let r of rewards) {
      let rL = floor((r.x - 50) / 100);
      let distY = abs(r.y - 500);
      laneScores[rL] += (2000 - distY);
    }
    let bestL = 0, maxS = -Infinity;
    for(let i=0; i<3; i++) { if(laneScores[i] > maxS) { maxS = laneScores[i]; bestL = i; } }
    lane = bestL;
  }

  pX = lerp(pX, 50 + lane * 100 + 25, 0.35);
  if (magT > 0) magT--;

  let spawnRate = max(10, 45 - (level * 2));
  if (frameCount % spawnRate === 0 && !finishLine) {
    let l = floor(random(3)), x = 50 + l * 100 + 30;
    
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
    if (finishLine.y > 520) { levelComplete(); return; }
  }

  handle(cns, "GOLD"); handle(gCoins, "GREEN"); handle(mags, "MAG");
  handle(obs, "RED"); handle(mons, "MONSTER"); 

  drawDetailedCar(pX, 500);
  drawUI(currentTarget, currentProgress);

  if (autoT > 0 && autoT <= 180) {
    let count = ceil(autoT / 60);
    push();
    textAlign(CENTER, CENTER);
    textSize(100); fill(255, 0, 0, 200); text(count, 200, 300);
    textSize(25); fill(255); text("DİREKSİYONA GEÇ!", 200, 380);
    pop();
  }
}

function handle(list, type) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y += spd;
    if (type === "GOLD" && magT > 0) {
      let d = dist(list[i].x, list[i].y, pX, 500);
      if (d < 180) { list[i].x = lerp(list[i].x, pX + 5, 0.2); list[i].y = lerp(list[i].y, 510, 0.2); }
    }
    
    // KESİN ÇÖZÜM: Renk yoksa bile varsayılan olarak mor ata. Kare çıkma ihtimalini öldürdük.
    let col = (type === "MONSTER") ? (list[i].col || "#9400D3") : null;
    drawAsset(list[i].x, list[i].y, type, col);
    
    if (dist(list[i].x+20, list[i].y+20, pX+25, 540) < 45) {
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
  // PANEL
  fill(0, 150); rect(10, 10, 160, 85, 10);
  fill(255); textAlign(LEFT); textSize(12);
  text("BÖLÜM: " + level, 20, 30); 
  fill(255, 215, 0); text("HEDEF: " + target, 20, 52);
  fill(0, 255, 100); text("ALINAN: " + progress, 20, 74);
  
  if (magT > 0) { fill(0, 255, 255); text("🧲 " + ceil(magT/60) + "s", 20, 115); }
  if (autoT > 0) { fill(0, 255, 100); text("🤖 " + ceil(autoT/60) + "s", 95, 115); }

  // İLERLEME ÇUBUĞU - YENİDEN TASARLANDI
  let barX = 20, barY = 150, barW = 25, barH = 300;
  fill(50, 200); stroke(255); strokeWeight(2);
  rect(barX, barY, barW, barH, 5); 
  
  let fillH = map(min(progress, target), 0, target, 0, barH);
  noStroke();
  fill(0, 255, 127); 
  rect(barX + 2, barY + barH - fillH + 2, barW - 4, fillH - 4, 3);
  
  fill(255); textSize(10); textAlign(CENTER);
  text("%" + floor((progress/target)*100), barX + barW/2, barY - 10);
}

function drawAsset(x, y, type, col) { 
  push(); 
  translate(x + 20, y + 20); 
  if (type === "GOLD") { 
    fill(255, 215, 0); ellipse(0, 0, 25, 25); fill(0); textAlign(CENTER, CENTER); text("$", 0, 2); 
  } else if (type === "MAG") { 
    stroke(255, 0, 0); strokeWeight(6); noFill(); arc(0, 0, 24, 24, PI, 0); 
  } else if (type === "GREEN") { 
    fill(0, 255, 100); ellipse(0, 0, 30, 30); fill(255); textSize(10); text("AUTO", 0, 5); 
  } else if (type === "RED") {
    fill(200, 0, 0); rect(-15, -15, 30, 30, 5);
  } else if (type === "MONSTER") { 
    // Kare çizilmesini engelleyen mutlak çizim:
    fill(col); stroke(0); strokeWeight(2);
    if (y < 350) {
      ellipse(0, 0, 42, 42);
      fill(255); ellipse(-10, -5, 10, 10); ellipse(10, -5, 10, 10);
      fill(0); ellipse(-10, -5, 4); ellipse(10, -5, 4);
      noFill(); stroke(0); arc(0, 8, 20, 10, 0.2, PI-0.2); 
    } else {
      beginShape(); vertex(-22, -18); vertex(22, -22); vertex(20, 20); vertex(-20, 20); endShape(CLOSE);
      fill(255, 100, 100); ellipse(-10, -5, 12, 12); ellipse(10, -5, 12, 12);
      fill(0); ellipse(-10, -5, 5); ellipse(10, -5, 5);
      fill(255); noStroke(); triangle(-8, 10, -4, 10, -6, 18); triangle(4, 10, 8, 10, 6, 18);
      stroke(0); noFill(); arc(0, 5, 25, 15, 0.1, PI-0.1);
    }
  } 
  pop(); 
}

function drawDetailedCar(x, y) {
  push();
  fill(carColor); rect(x, y, 50, 85, 8);
  fill(40, 120, 200, 220); rect(x+5, y+10, 40, 18, 2);
  fill(40, 120, 200, 220); rect(x+5, y+68, 40, 10, 2);
  fill(carColor); rect(x-4, y+15, 5, 8); rect(x+49, y+15, 5, 8);
  fill(255, 255, 200); ellipse(x+10, y+5, 12, 6); ellipse(x+40, y+5, 12, 6);
  fill(180, 0, 0); rect(x+5, y+80, 10, 4); rect(x+35, y+80, 10, 4);
  if (hasExtraLife) { noFill(); stroke(255, 0, 0); strokeWeight(3); ellipse(x+25, y+42, 70); }
  pop();
}

function levelComplete() { totalGold += currentSessionGold; currentSessionGold = 0; if (level < maxLevels) { level++; spd += 0.5; state = "MENU"; showNextLevel = true; clearStage(); sound(1500, 0.4); } else { state = "SCOREBOARD"; } }
function gameOver() { if (score > highScore) highScore = score; state = "MENU"; showNextLevel = false; fullReset(); sound(200, 0.5); }
function drawMainMenu() { fill(0, 180); rect(40, 40, 320, 520, 30); fill(255); textAlign(CENTER); textSize(32); text("OTOBAN FARESİ", 200, 90); fill(255, 215, 0); textSize(20); text("KASA: " + totalGold + " $", 200, 130); drawMenuButton(showNextLevel ? "SIRADAKİ BÖLÜM" : "GAZA BAS", 220); drawMenuButton("MARKET", 300); drawMenuButton("REKORLAR", 380); }
function drawShop() { fill(0, 240); rect(20, 20, 360, 560, 20); fill(255, 215, 0); textSize(28); text("MARKET", 200, 70); textSize(18); text("BAKİYE: " + totalGold + " $", 200, 100); drawShopItem("Mıknatıs Süresi+", 500, 160, () => { magPower += 120; }); drawShopItem("Oto Pilot Süresi+", 500, 240, () => { autoPower += 120; }); drawShopItem("Çelik Kalkan (1 Can)", 1000, 320, () => { hasExtraLife = true; }); fill(255); text("GERİ DÖN", 200, 540); }
function drawShopItem(label, price, y, action) { let h = mouseIn(50, 350, y-30, y+30); fill(h ? 255 : 200, 50); rect(50, y-30, 300, 60, 10); fill(255); textAlign(LEFT); text(label, 70, y+5); textAlign(RIGHT); fill(255, 215, 0); text(price + " $", 330, y+5); if (h && mouseIsPressed && totalGold >= price) { totalGold -= price; action(); mouseIsPressed = false; sound(1200, 0.2); } }
function mousePressed() { if (state === "MENU") { if (mouseIn(100, 300, 195, 245)) { if (showNextLevel) { state = "PLAY"; showNextLevel = false; } else { fullReset(); state = "PLAY"; } } if (mouseIn(100, 300, 275, 325)) state = "SHOP"; if (mouseIn(100, 300, 355, 405)) state = "SCOREBOARD"; } else if (state === "SHOP") { if (mouseIn(100, 300, 500, 580)) state = "MENU"; } else if (state === "PLAY") { lane = mouseX < 133 ? 0 : (mouseX < 266 ? 1 : 2); } else state = "MENU"; }
function sound(f, a) { let osc = new p5.Oscillator('sine'); osc.start(); osc.freq(f); osc.amp(a, 0); osc.amp(0, 0.2); setTimeout(() => osc.stop(), 200); }
function mouseIn(x1, x2, y1, y2) { return mouseX > x1 && mouseX < x2 && mouseY > y1 && mouseY < y2; }
function drawMenuButton(label, y) { let h = mouseIn(100, 300, y-25, y+25); fill(h ? 255 : 200, 100); rect(100, y-25, 200, 50, 10); fill(255); text(label, 200, y+7); }
function clearStage() { obs = []; mons = []; cns = []; mags = []; gCoins = []; magT = 0; autoT = 0; magSpawned = false; autoSpawned = false; finishLine = null; coinsCount = 1; }
function fullReset() { clearStage(); score = 0; level = 1; spd = 5.5; currentSessionGold = 0; }
function drawFinishLine(y) { let s = 25; for (let i = 0; i < 12; i++) { fill((i + floor(frameCount/5)) % 2 === 0 ? 255 : 0); rect(50 + i * s, y, s, s); fill((i + floor(frameCount/5)) % 2 !== 0 ? 255 : 0); rect(50 + i * s, y + s, s, s); } }
function drawScoreBoard() { fill(0, 180); rect(40, 100, 320, 400, 30); fill(255, 215, 0); textAlign(CENTER); textSize(32); text("REKOR", 200, 180); textSize(48); text(highScore, 200, 280); fill(255); textSize(20); text("MENÜYE DÖN", 200, 450); }
