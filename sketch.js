// ============================================================
//  OTOBAN FARESİ — v2.0
//  Yenilikler: 3 Can • Yakıt Sistemi • Boss Seviyeleri
//  Tehlikeli Şerit (2x) • Partiküller • Araç Yükseltme
//  Farklı Düşman Davranışları (normal/switcher/speeder)
// ============================================================

// ─── TEMEL ─────────────────────────────────────────────────
var pX, lane = 1, coinsCount = 1, state = "MENU";
var spd = 6, magT = 0, autoT = 0, level = 1, baseTarget = 15;
var obs = [], cns = [], mons = [], mags = [], autos = [], fuelItems = [];
var finishLine = null, boss = null;
var totalGold = 0, highScore = 0, showNextLevel = false;
var carColor = [0, 120, 255];
var clicked = false;

// ─── CAN SİSTEMİ ────────────────────────────────────────────
var lives = 3, invincible = 0;

// ─── YAKIT ──────────────────────────────────────────────────
var fuel = 100, maxFuel = 100;

// ─── PARTİKÜLLER ────────────────────────────────────────────
var particles = [];

// ─── TEHLİKELİ ŞERİT (2x altın) ────────────────────────────
var dangerousLane = 1;

// ─── YÜKSELTMELER ───────────────────────────────────────────
var upgrades      = { engine: 0, brakes: 0, armor: 0 };
var upgradePrices = {
  engine: [200, 400, 800],   // motor → yakıt tüketimi azalır
  brakes: [150, 300, 600],   // fren  → şerit geçiş hızı artar
  armor:  [300, 600, 1200],  // zırh  → +1 can hakkı
};

// ============================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  pX = width / 2;
}

function draw() {
  background(130, 190, 230);
  drawEnvironment();
  if      (state === "MENU") drawMainMenu();
  else if (state === "PLAY") runGame();
  else if (state === "SHOP") drawShop();
  updateParticles(); // Her zaman en üstte çizilir
  clicked = false;
}

function mousePressed() {
  clicked = true;
  // DÜZELTME: Şerit sınırları yol koordinatlarına göre
  if (state === "PLAY" && autoT <= 0) {
    let roadX = width * 0.1, roadW = width * 0.8;
    lane = mouseX < roadX + roadW * 0.33 ? 0
         : mouseX < roadX + roadW * 0.66 ? 1 : 2;
  }
}

// ============================================================
// ORTAM
function drawEnvironment() {
  fill(34, 139, 34);
  rect(0, 0, width * 0.1, height);
  rect(width * 0.9, 0, width * 0.1, height);

  let roadW = width * 0.8, roadX = width * 0.1;
  fill(50, 50, 50);
  rect(roadX, 0, roadW, height);

  // Tehlikeli şerit kırmızı vurgusu
  if (state === "PLAY") {
    noStroke();
    fill(255, 30, 30, 38);
    rect(roadX + dangerousLane * (roadW / 3), 0, roadW / 3, height);
  }

  // Yol çizgileri
  stroke(255, 100); strokeWeight(width * 0.01);
  let lOff = (frameCount * spd) % 60;
  for (let y = -60; y < height; y += 60) {
    line(roadX + roadW * 0.33, y + lOff, roadX + roadW * 0.33, y + lOff + 30);
    line(roadX + roadW * 0.66, y + lOff, roadX + roadW * 0.66, y + lOff + 30);
  }
  noStroke();
}

// ============================================================
// ANA OYUN DÖNGÜSÜ
function runGame() {
  let roadW    = width * 0.8, roadX = width * 0.1;
  let target   = level * baseTarget;
  let progress = coinsCount - 1;
  let carW     = width * 0.15, carH = carW * 1.7;
  let lerpSpd  = 0.25 + upgrades.brakes * 0.06;
  let fuelDrain = max(0.006, 0.016 - upgrades.engine * 0.003);

  // YAKIT AZALMASI
  fuel -= fuelDrain;
  if (fuel <= 0) {
    fuel = 0;
    loseLife();
    if (state !== "PLAY") return;
    fuel = 50;
  }

  // ZAMANLAYICILAR
  if (autoT > 0) { autoT--; let n = findNearestTarget(); if (n) lane = n.l; }
  if (magT > 0)  magT--;
  if (invincible > 0) invincible--;

  pX = lerp(pX, roadX + lane * (roadW / 3) + roadW / 6 - carW / 2, lerpSpd);

  // NESNE ÜRETİMİ
  if (frameCount % max(20, 60 - level * 2) === 0 && !finishLine && !boss) {
    if (progress >= target) {
      finishLine = { y: -50 };
    } else {
      let l = floor(random(3));
      let x = roadX + l * (roadW / 3) + roadW / 6 - width * 0.05;
      let r = random();
      if (r < 0.25) {
        let t = random();
        let mType = t < 0.4 ? "normal" : t < 0.7 ? "switcher" : "speeder";
        let mCol  = mType === "normal" ? "#9400D3" : mType === "switcher" ? "#00CED1" : "#FF4500";
        mons.push({ x, y: -100, l, col: mCol, type: mType, switchTimer: 90 });
      } else if (r < 0.38) { obs.push({ x, y: -100, l }); }
      else if   (r < 0.41) { mags.push({ x, y: -100, l }); }
      else if   (r < 0.44) { autos.push({ x, y: -100, l }); }
      else                  { cns.push({ x, y: -100, l }); }
    }
  }

  // Yakıt item üretimi
  if (frameCount % 210 === 0 && !boss) {
    let l = floor(random(3));
    fuelItems.push({ x: roadX + l * (roadW / 3) + roadW / 6 - width * 0.05, y: -100, l });
  }

  // BİTİŞ ÇİZGİSİ
  if (finishLine) {
    finishLine.y += spd;
    fill(255, 255, 255, 210); rect(roadX, finishLine.y, roadW, 42);
    fill(0); textAlign(CENTER); textSize(20); noStroke();
    text("★ SEVİYE SONU ★", width / 2, finishLine.y + 29);
    if (finishLine.y > height - 200) {
      finishLine = null;
      if (level % 5 === 0) spawnBoss(roadX, roadW);
      else                 levelComplete();
    }
  }

  // BOSS
  if (boss) { updateBoss(roadX, roadW, carW, carH); if (state !== "PLAY") return; }

  // NESNELER
  handle(cns,       "GOLD");
  handle(obs,       "TIRE");
  handle(mons,      "MONSTER");
  handle(mags,      "MAG");
  handle(autos,     "AUTO");
  handle(fuelItems, "FUEL");

  // İLERLEME ÇUBUĞU (sol)
  fill(0, 100); rect(roadX - 28, height * 0.2, 16, height * 0.6, 10);
  fill(0, 255, 100);
  let barH = map(constrain(progress, 0, target), 0, target, 0, height * 0.6);
  rect(roadX - 28, height * 0.8 - barH, 16, barH, 10);

  // ARAÇ (invincible yanıp sönme efekti)
  if (!(invincible > 0 && floor(invincible / 8) % 2 === 0)) {
    drawDetailedCar(pX, height - 180, carW, carH);
  }

  drawUI(target, progress, roadX, roadW);
}

// ============================================================
// BOSS SİSTEMİ
function spawnBoss(roadX, roadW) {
  boss = { x: roadX + roadW * 0.2, y: -160, w: roadW * 0.6, h: 100, dx: 2.5, speed: 1.5 };
}

function updateBoss(roadX, roadW, carW, carH) {
  boss.y += boss.speed;
  boss.x += boss.dx;

  // Yol sınırlarında zıpla
  if (boss.x <= roadX + 5)                  { boss.x = roadX + 5;                  boss.dx =  abs(boss.dx); }
  if (boss.x + boss.w >= roadX + roadW - 5) { boss.x = roadX + roadW - boss.w - 5; boss.dx = -abs(boss.dx); }

  // Boss Çizimi
  push();
  fill(120, 0, 0); rect(boss.x, boss.y, boss.w, boss.h, 10);
  fill(255, 0, 0);
  ellipse(boss.x + boss.w * 0.25, boss.y + boss.h * 0.35, 28, 28);
  ellipse(boss.x + boss.w * 0.75, boss.y + boss.h * 0.35, 28, 28);
  fill(0);
  ellipse(boss.x + boss.w * 0.25, boss.y + boss.h * 0.35, 12, 12);
  ellipse(boss.x + boss.w * 0.75, boss.y + boss.h * 0.35, 12, 12);
  fill(80, 0, 0); rect(boss.x + boss.w * 0.2, boss.y + boss.h * 0.6, boss.w * 0.6, boss.h * 0.28, 4);
  fill(255);
  for (let i = 0; i < 5; i++) {
    rect(boss.x + boss.w * 0.22 + i * boss.w * 0.12, boss.y + boss.h * 0.6, boss.w * 0.08, boss.h * 0.15);
  }
  fill(255); noStroke(); textAlign(CENTER); textSize(16);
  text("!! BOSS !!", boss.x + boss.w / 2, boss.y - 10);
  pop();

  // Çarpışma (AABB)
  if (invincible <= 0 &&
      pX < boss.x + boss.w && pX + carW > boss.x &&
      height - 180 < boss.y + boss.h && height - 180 + carH > boss.y) {
    loseLife();
    if (state !== "PLAY") return;
  }

  // Boss ekrandan çıktı → seviye tamamlandı
  if (boss.y > height) { boss = null; levelComplete(); }
}

// ============================================================
// NESNE İŞLEME
function handle(list, type) {
  let carW  = width * 0.15;
  let roadX = width * 0.1, roadW = width * 0.8;

  for (let i = list.length - 1; i >= 0; i--) {
    let obj = list[i];
    let sz  = width * 0.12;

    // Hareket
    if (type === "MONSTER") updateMonster(obj, roadX, roadW);
    else                    obj.y += spd;

    // Mıknatıs çekimi
    if (type === "GOLD" && magT > 0 && dist(obj.x, obj.y, pX, height - 180) < 300) {
      obj.x = lerp(obj.x, pX, 0.2);
      obj.y = lerp(obj.y, height - 170, 0.2);
    }

    drawAsset(obj.x, obj.y, type, obj.col);

    // Çarpışma
    if (dist(obj.x + sz / 2, obj.y + sz / 2, pX + carW / 2, height - 150) < carW * 0.75) {
      if (type === "GOLD") {
        // Tehlikeli şerit → 2x altın
        let gain = (obj.l === dangerousLane) ? 20 : 10;
        totalGold  += gain;
        coinsCount ++;
        spawnParticles(obj.x + sz / 2, obj.y + sz / 2, [255, 215, 0]);
        if (obj.l === dangerousLane) spawnParticles(obj.x + sz / 2, obj.y + sz / 2, [255, 120, 0]);
        list.splice(i, 1);
      } else if (type === "MAG")  { magT  = 600; list.splice(i, 1); }
      else if   (type === "AUTO") { autoT = 600; list.splice(i, 1); }
      else if   (type === "FUEL") {
        fuel = min(fuel + 40, maxFuel);
        spawnParticles(obj.x + sz / 2, obj.y + sz / 2, [0, 220, 100]);
        list.splice(i, 1);
      } else { // TIRE, MONSTER
        if (invincible <= 0) {
          list.splice(i, 1);
          loseLife();
          if (state !== "PLAY") return;
        }
      }
    } else if (obj.y > height) {
      list.splice(i, 1);
    }
  }
}

// Düşman davranışları
function updateMonster(m, roadX, roadW) {
  // Speeder: ekrana yaklaştıkça hızlanır
  if (m.type === "speeder") {
    m.y += spd + map(constrain(m.y, 0, height), 0, height, 0, spd * 1.2);
  } else {
    m.y += spd;
  }

  // Switcher: periyodik şerit değiştirir
  if (m.type === "switcher") {
    m.switchTimer--;
    if (m.switchTimer <= 0) {
      m.l = floor(random(3));
      m.switchTimer = floor(random(60, 120));
    }
    let targetX = roadX + m.l * (roadW / 3) + roadW / 6 - width * 0.05;
    m.x = lerp(m.x, targetX, 0.05);
  }
}

// ============================================================
// ASSET ÇİZİM
function drawAsset(x, y, type, col) {
  let sz = width * 0.12;
  push(); translate(x + sz / 2, y + sz / 2);

  if (type === "GOLD") {
    fill(255, 215, 0); stroke(200, 150, 0); strokeWeight(2); ellipse(0, 0, sz, sz);
    fill(0); noStroke(); textAlign(CENTER, CENTER); textSize(sz * 0.55); text("$", 0, 2);

  } else if (type === "TIRE") {
    fill(30); ellipse(0, 0, sz, sz);
    fill(100); ellipse(0, 0, sz * 0.6, sz * 0.6);

  } else if (type === "MAG") {
    stroke(255, 0, 0); strokeWeight(sz * 0.2); noFill();
    arc(0, 0, sz * 0.6, sz * 0.6, 0, PI);
    line(-sz * 0.3, 0, -sz * 0.3, -sz * 0.3);
    line( sz * 0.3, 0,  sz * 0.3, -sz * 0.3);
    noStroke(); fill(255);
    rect(-sz * 0.4, -sz * 0.4, sz * 0.2, sz * 0.1);
    rect( sz * 0.2, -sz * 0.4, sz * 0.2, sz * 0.1);

  } else if (type === "AUTO") {
    stroke(0, 255, 255); strokeWeight(3); noFill();
    ellipse(0, 0, sz * 0.8, sz * 0.8);
    line(-sz * 0.4, 0, sz * 0.4, 0);
    line(0, 0, 0, sz * 0.4);

  } else if (type === "FUEL") {
    fill(0, 180, 70); stroke(0, 130, 50); strokeWeight(2);
    rect(-sz * 0.28, -sz * 0.38, sz * 0.55, sz * 0.75, 6);
    fill(0, 150, 60); noStroke(); rect(-sz * 0.15, -sz * 0.5, sz * 0.3, sz * 0.15, 3);
    fill(200, 255, 200); textAlign(CENTER, CENTER); textSize(sz * 0.22); text("YAKIT", 0, sz * 0.15);

  } else if (type === "MONSTER") {
    fill(col || "#9400D3"); ellipse(0, 0, sz, sz);
    fill(255);
    ellipse(-sz * 0.2, -sz * 0.1, sz * 0.25);
    ellipse( sz * 0.2, -sz * 0.1, sz * 0.25);
    fill(0);
    ellipse(-sz * 0.2, -sz * 0.1, sz * 0.1);
    ellipse( sz * 0.2, -sz * 0.1, sz * 0.1);
    // y burada orijinal ekran koordinatı (translate öncesi)
    if (y < height * 0.5) {
      noFill(); stroke(0); strokeWeight(2); arc(0, sz * 0.1, sz * 0.4, sz * 0.2, 0, PI);
    } else {
      fill(255); stroke(0); strokeWeight(1);
      rect(-sz * 0.25, sz * 0.05, sz * 0.5, sz * 0.25, 2);
      line(-sz * 0.25, sz * 0.17, sz * 0.25, sz * 0.17);
    }
  }
  pop();
}

// ============================================================
// ARAÇ ÇİZİM
function drawDetailedCar(x, y, w, h) {
  // DÜZELTME: fill() array almaz → spread operatörü
  fill(...carColor); rect(x, y, w, h, 12);
  fill(50, 150, 255, 200); rect(x + w * 0.1, y + h * 0.15, w * 0.8, h * 0.25, 2);
  if (autoT > 0) { stroke(0, 255, 255); strokeWeight(3); noFill(); rect(x-5, y-5, w+10, h+10, 15); noStroke(); }
  if (magT > 0)  { stroke(255, 0, 0);   strokeWeight(2); noFill(); ellipse(x+w/2, y+h/2, w*1.5); noStroke(); }
}

// ============================================================
// PARTİKÜL SİSTEMİ
function spawnParticles(x, y, col) {
  for (let i = 0; i < 8; i++) {
    let a = random(TWO_PI), s = random(2, 6);
    particles.push({ x, y, vx: cos(a) * s, vy: sin(a) * s, life: 1.0, col, sz: random(6, 14) });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.15; // yerçekimi
    p.life -= 0.04;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    noStroke();
    fill(p.col[0], p.col[1], p.col[2], p.life * 255);
    ellipse(p.x, p.y, p.sz * p.life);
  }
}

// ============================================================
// UI
function drawUI(target, progress, roadX, roadW) {
  // Sol üst panel
  fill(0, 185); rect(15, 15, 185, 145, 15);
  textAlign(LEFT); noStroke();
  textSize(16); fill(255, 255, 0); text("SEVİYE: " + level, 28, 42);
  textSize(14); fill(0, 255, 100);  text("TOPLANAN: " + progress + "/" + target, 28, 65);
                fill(255, 165, 0);  text("KASA: " + totalGold + "$", 28, 87);

  // Canlar
  let maxL = 3 + upgrades.armor;
  textSize(19); fill(255, 50, 50);
  let hStr = "";
  for (let i = 0; i < lives; i++) hStr += "♥️";
  text(hStr, 28, 112);
  fill(80, 0, 0); textSize(19);
  let eStr = "";
  for (let i = lives; i < maxL; i++) eStr += "♡";
  if (eStr) text(eStr, 28 + lives * 19, 112);
  textSize(12); fill(180); text("CAN", 28, 132);

  // Tehlikeli şerit etiketi
  let laneW = roadW / 3;
  fill(255, 80, 80, 220); textAlign(CENTER); textSize(13); noStroke();
  text("!! 2x ALTIN !!", roadX + dangerousLane * laneW + laneW / 2, height * 0.065);

  // Yakıt çubuğu (sağ)
  let fuelX = roadX + roadW + 10;
  fill(0, 100); rect(fuelX, height * 0.2, 16, height * 0.6, 8);
  let fuelH   = map(fuel, 0, maxFuel, 0, height * 0.6);
  let fuelCol = fuel > 50 ? color(0, 210, 80) : fuel > 25 ? color(255, 170, 0) : color(255, 50, 0);
  fill(fuelCol); rect(fuelX, height * 0.8 - fuelH, 16, fuelH, 8);
  fill(255); textAlign(CENTER); textSize(10); noStroke();
  text("YKT", fuelX + 8, height * 0.183);

  // Güç-up göstergeleri
  if (magT > 0) {
    fill(200, 0, 0, 210); rect(width - 130, 15, 115, 30, 8);
    fill(255); textSize(13); textAlign(LEFT); text("MKNTS: " + ceil(magT / 60) + "s", width - 120, 35);
  }
  if (autoT > 0) {
    fill(0, 180, 180, 210); rect(width - 130, 50, 115, 30, 8);
    fill(255); textSize(13); textAlign(LEFT); text("OTOPL: " + ceil(autoT / 60) + "s", width - 120, 70);
  }

  // Boss uyarısı (level 5,10,15...)
  if (level % 5 === 0 && !boss) {
    fill(200, 0, 0, 80 + 60 * sin(frameCount * 0.12));
    rect(roadX, height * 0.44, roadW, 36, 6);
    fill(255); textAlign(CENTER); textSize(17); noStroke();
    text("!! BOSS SEVİYESİ GELİYOR !!", width / 2, height * 0.466);
  }
}

// ============================================================
// CAN KAYBI
function loseLife() {
  lives--;
  invincible = 120; // ~2 sn dokunulmazlık
  spawnParticles(pX + width * 0.075, height - 160, [255, 50, 50]);
  if (lives <= 0) gameOver();
}

// ============================================================
// MENÜ
function drawMainMenu() {
  fill(0, 200); rect(width * 0.1, height * 0.12, width * 0.8, height * 0.76, 25);
  fill(255); textAlign(CENTER);
  textSize(width * 0.09); text("OTOBAN FARESİ", width / 2, height * 0.25);
  fill(255, 215, 0); textSize(width * 0.055); text("KASA: " + totalGold + "$", width / 2, height * 0.35);
  fill(0, 255, 255); textSize(width * 0.04);  text("EN YUKSEK: Sv." + highScore, width / 2, height * 0.42);
  if (showNextLevel) {
    fill(255, 200, 0); textSize(width * 0.033);
    let bossWarn = (level % 5 === 0) ? " -- BOSS!" : "";
    text("Sonraki: Seviye " + level + bossWarn, width / 2, height * 0.49);
  }
  btn(showNextLevel ? "SONRAKI SEVIYE" : "BASLA", height * 0.58, () => { state = "PLAY"; showNextLevel = false; });
  btn("MARKET", height * 0.70, () => { state = "SHOP"; });
}

// ============================================================
// MAGAZA
function drawShop() {
  fill(18, 18, 28); rect(0, 0, width, height);
  fill(255, 215, 0); textSize(26); textAlign(CENTER); noStroke();
  text("MODiFiYE MARKET", width / 2, 52);
  fill(255, 215, 0); textSize(17); text("KASA: " + totalGold + "$", width / 2, 78);

  fill(160); textAlign(LEFT); textSize(12); text("-- ARAC RENGi --", width * 0.12, height * 0.135);
  shopColor("Palio Kirmizisi", 100, [220,  20,  60], height * 0.155);
  shopColor("Gece Mavisi",     150, [ 25,  25, 112], height * 0.255);
  shopColor("LPG Yesili",      250, [ 50, 205,  50], height * 0.355);

  fill(160); textAlign(LEFT); textSize(12); text("-- YUKSELTMELEr --", width * 0.12, height * 0.465);
  shopUpgrade("engine", "Motor",  "Yakit tuketimi azalir",    height * 0.485);
  shopUpgrade("brakes", "Fren",   "Serit degistirme hizlanir", height * 0.595);
  shopUpgrade("armor",  "Zirh",   "+1 can hakki kazanirsin",   height * 0.705);

  btn("GERi DON", height * 0.87, () => { state = "MENU"; });
}

function shopColor(name, price, col, y) {
  let isSel     = carColor[0] === col[0] && carColor[1] === col[1] && carColor[2] === col[2];
  let canAfford = totalGold >= price && !isSel;
  fill(isSel ? 65 : canAfford ? 50 : 22); rect(width * 0.1, y, width * 0.8, 65, 12);
  fill(...col); rect(width * 0.1 + 8, y + 8, 48, 48, 6);
  fill(isSel ? 200 : 255); textAlign(LEFT); textSize(16); text(name, width * 0.1 + 68, y + 38);
  textAlign(RIGHT);
  if (isSel) {
    fill(0, 255, 100); textSize(14); text("SECILI", width * 0.88, y + 38);
  } else if (canAfford) {
    fill(255, 215, 0); textSize(15); text(price + "$", width * 0.88, y + 38);
  } else {
    fill(120); textSize(15); text(price + "$", width * 0.88, y + 38);
  }
  if (clicked && mouseY > y && mouseY < y + 65 && canAfford) {
    totalGold -= price; carColor = col;
  }
}

function shopUpgrade(key, name, desc, y) {
  let lvl    = upgrades[key];
  let prices = upgradePrices[key];
  let maxLvl = prices.length;
  let price  = lvl < maxLvl ? prices[lvl] : 0;
  let canAfford = totalGold >= price && lvl < maxLvl;

  fill(canAfford ? 50 : 22); rect(width * 0.1, y, width * 0.8, 72, 12);
  fill(canAfford ? 255 : 120); textAlign(LEFT); textSize(16); text(name, width * 0.15, y + 26);
  fill(160); textSize(12); text(desc, width * 0.15, y + 48);

  // Yıldız göstergesi
  fill(255, 215, 0); textAlign(CENTER); textSize(20);
  let stars = "";
  for (let i = 0; i < maxLvl; i++) stars += (i < lvl ? "*" : "o");
  text(stars, width * 0.55, y + 44);

  textAlign(RIGHT);
  if (lvl >= maxLvl) {
    fill(0, 255, 100); textSize(14); text("MAX", width * 0.88, y + 40);
  } else {
    fill(canAfford ? color(255, 215, 0) : color(120)); textSize(16); text(price + "$", width * 0.88, y + 40);
    if (clicked && mouseY > y && mouseY < y + 72 && canAfford) {
      totalGold -= price;
      upgrades[key]++;
      if (key === "armor") lives++; // anında can ekle
    }
  }
}

// ============================================================
// YARDIMCILAR
function findNearestTarget() {
  let combined = [...cns, ...mags, ...autos];
  let target = null, minD = 1000;
  for (let c of combined) {
    let d = dist(pX, height - 180, c.x, c.y);
    if (d < minD) { minD = d; target = c; }
  }
  return target;
}

function levelComplete() {
  level++;
  spd += 0.4;
  resetStage();
  state = "MENU";
  showNextLevel = true;
}

function gameOver() {
  if (level > highScore) highScore = level;
  level  = 1;
  spd    = 6;
  resetStage();
  state = "MENU";
  showNextLevel = false;
}

function resetStage() {
  obs = []; mons = []; cns = []; mags = []; autos = []; fuelItems = [];
  finishLine = null; boss = null; particles = [];
  coinsCount = 1; magT = 0; autoT = 0; invincible = 0;
  fuel          = maxFuel;
  lives         = 3 + upgrades.armor;   // zırh yükseltmesi canları etkiler
  dangerousLane = floor(random(3));      // her seviyede rastgele tehlikeli şerit
}

// DÜZELTME: clicked flag'i ile güvenli buton kontrolü
function btn(txt, y, action) {
  let hover = mouseY > y - 30 && mouseY < y + 30 && mouseX > width * 0.2 && mouseX < width * 0.8;
  fill(hover ? 255 : 210, 220); rect(width * 0.2, y - 30, width * 0.6, 60, 20);
  fill(0); textSize(20); textAlign(CENTER); noStroke(); text(txt, width / 2, y + 8);
  if (hover && clicked) action();
}
