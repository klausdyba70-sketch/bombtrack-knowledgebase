/* ================= ACADEMY ================= */
const tx = (en, de) => lang === "de" ? de : en;
const BIKES = P.filter(p => p.k === "bike");
const CATS = ["Gravel & Allroad Bike", "Adventure & Touring Bike", "Mountain Bike", "Urban Bike", "Cyclocross Bike"];
const catName = c => ({ "Gravel & Allroad Bike": "Gravel & Allroad", "Adventure & Touring Bike": "Adventure & Touring", "Mountain Bike": "Mountain", "Urban Bike": "Urban", "Cyclocross Bike": "Cyclocross" }[c] || c);
function specVal(p, rx, lg) { const x = (lg ? p[lg] : L(p)) || p.en; for (const g of Object.values(x.s || {})) for (const k in g) if (rx.test(k)) return g[k]; return ""; }
const RX = { frame: /^(frame|rahmen)$/i, cas: /cassette|kassette|^cog/i, ring: /^(chainring|kettenblatt)/i, brakes: /^(brakes|bremsen)$/i, weight: /complete weight|gesamtgewicht|komplettgewicht/i, ftire: /front tire|vorderreifen/i, rack: /^(rack|gepäckträger)/i, light: /^(light|beleuchtung)/i, fork: /^(fork|gabel)$/i, maxw: /maximum rider|maximales fahrergewicht/i };
function material(p) { const f = specVal(p, RX.frame, "en").toLowerCase(); if (/carbon/.test(f)) return tx("Carbon", "Carbon"); if (/titan/.test(f)) return tx("Titanium", "Titan"); if (/alu|6061|7005/.test(f)) return tx("Aluminium", "Aluminium"); if (/crmo|steel|4130|reynolds|columbus/.test(f)) return tx("Steel", "Stahl"); return "–"; }
const kg = p => { const m = specVal(p, RX.weight, "en").match(/(\d+(?:[.,]\d+)?)\s*kg/i); return m ? parseFloat(m[1].replace(",", ".")) : null; };
function stockTire(p) { const d = TD[p.h]; const g = d && pickGroup(d.tires, "M"); return g && g.t[0] ? g.t[0] : null; }
function geoM(p, row) { const g = p.g && G[p.g]; if (!g || !g.rows[row]) return null; return num(g.rows[row][sizeIdx(g)]); }
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (a, n) => shuffle(a).slice(0, n);

/* ---- learner profile & progress ---- */
let LEARN = null, LEARNERS = [], saveT = null;
try { LEARN = JSON.parse(localStorage.getItem("bt_learner") || "null"); } catch { LEARN = null; }
function blankLearner(name, role) { return { id: (me || "l_" + uid()), name, role, xp: 0, lessons: {}, visits: {}, quiz: [], known: [], practice: { best: 0, n: 0 }, pitch: { best: 0, n: 0 }, obj: { best: 0, n: 0 }, started: Date.now(), updated: Date.now() }; }
function saveLearner() {
  if (!LEARN) return; LEARN.updated = Date.now();
  try { localStorage.setItem("bt_learner", JSON.stringify(LEARN)); } catch {}
  clearTimeout(saveT); saveT = setTimeout(async () => { if (!db) return; try { await db.collection("learners").doc(LEARN.id).set(JSON.parse(JSON.stringify(LEARN))); } catch {} }, 700);
}
function addXP(n) { if (LEARN) { LEARN.xp = (LEARN.xp || 0) + n; saveLearner(); } }
function markVisit(k) { if (LEARN && !LEARN.visits[k]) { LEARN.visits[k] = Date.now(); addXP(5); } }
function subscribeLearners() { try { db.collection("learners").orderBy("updated", "desc").limit(300).onSnapshot(s => { LEARNERS = s.docs.map(d => ({ id: d.id, ...d.data() })); if (route.v === "academy") render(); }, () => {}); } catch {} }
const ROLES = () => [["staff", tx("Bombtrack staff", "Bombtrack-Team")], ["dist", tx("Distributor", "Distributor")], ["shop", tx("Shop / dealer", "Shop / Händler")]];
function needProfile(v, after) {
  if (LEARN && LEARN.name) return false;
  v.innerHTML = `<div class="wrap" style="max-width:520px"><div class="vhead"><h1>${tx("Welcome to the Academy", "Willkommen in der Academy")}</h1><p>${tx("Enter your name once. Lessons, quiz results and training are saved to you, and the team can see your progress.", "Gib einmal deinen Namen an. Lektionen, Quiz-Ergebnisse und Training werden dir zugeordnet, und das Team sieht deinen Fortschritt.")}</p></div>
    <form class="card form" id="lf" style="grid-template-columns:minmax(0,1fr)"><label>${tx("Name", "Name")}<input id="lf_n" required autocomplete="name" placeholder="${tx("First and last name", "Vor- und Nachname")}"></label>
    <label>${tx("Role", "Rolle")}<select id="lf_r">${ROLES().map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label><button class="btn primary">${tx("Start", "Los geht's")}</button></form></div>`;
  $("#lf").onsubmit = e => { e.preventDefault(); const n = $("#lf_n").value.trim(); if (!n) return; LEARN = blankLearner(n.slice(0, 60), $("#lf_r").value); saveLearner(); after ? after() : render(); };
  return true;
}
const AIC = {
  quiz: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/><path d="M9.8 7.8a2.3 2.3 0 0 1 4.4 1c0 1.5-2.2 1.8-2.2 3.2"/><circle cx="12" cy="13.9" r=".2"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="7" y="4" width="13" height="16" rx="2.2"/><path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20"/><path d="M10.5 9.5h6M10.5 13h4"/></svg>',
  practice: '<svg viewBox="0 0 24 24"><path d="M3.5 6A2 2 0 0 1 5.5 4h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2z"/><path d="M15.5 8.5h3a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2v3L15 17h-3.5a2 2 0 0 1-1.8-1.2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 4 2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 15.8l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/></svg>',
  cert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="m9 13.5-1.5 6.5L12 18l4.5 2-1.5-6.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
const medal = (ic, p) => { const r = 26, c = 2 * Math.PI * r, f = Math.min(1, p); return `<span class="medal ${f >= 1 ? "on" : ""}"><svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="trk"/><circle cx="32" cy="32" r="${r}" class="val" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/></svg><span class="ico">${AIC[ic]}</span></span>`; };
function badges(l) {
  l = l || LEARN || {};
  const q = (l.quiz || []).filter(x => x.n >= 8 && x.c / x.n >= 0.8).length;
  const stylesDone = CATS.filter(c => l.lessons?.[c]).length;
  return [
    { k: "cards", ic: "cards", t: tx("Flashcards", "Karteikarten"), d: tx("Know half of all bikes by heart", "Die Hälfte aller Bikes sicher kennen"), p: Math.min(1, (l.known || []).length / Math.max(1, Math.ceil(BIKES.length / 2))) },
    { k: "quiz", ic: "star", t: tx("Quiz pro", "Quiz-Profi"), d: tx("3 quizzes with 80% or more", "3 Quiz mit mindestens 80 %"), p: Math.min(1, q / 3) },
    { k: "sales", ic: "practice", t: tx("Sales", "Verkauf"), d: tx("Score 7+ in counter practice, objections or pitch", "7+ Punkte im Verkaufstraining, bei Einwänden oder im Pitch"), p: Math.max(l.practice?.best || 0, l.pitch?.best || 0, l.obj?.best || 0) >= 7 ? 1 : Math.max(l.practice?.best || 0, l.pitch?.best || 0, l.obj?.best || 0) / 7 }
  ];
}
const quizPct = l => { const q = (l.quiz || []); const c = q.reduce((a, x) => a + x.c, 0), n = q.reduce((a, x) => a + x.n, 0); return n ? Math.round(c / n * 100) : null; };

function viewAcademy(v) {
  v.style.padding = "";
  if (needProfile(v)) return;
  markVisit("academy");
  const B = badges(), done = B.filter(b => b.p >= 1).length, cert = done === B.length;
  const roleName = (ROLES().find(r => r[0] === LEARN.role) || [0, ""])[1];
  const mods = [
    ["quiz", tx("Quiz", "Quiz"), tx("10 questions from the real product data, with the reason for every answer.", "10 Fragen aus den echten Produktdaten, mit Erklärung zu jeder Antwort."), quizPct(LEARN) != null ? quizPct(LEARN) + " %" : ""],
    ["cards", tx("Flashcards", "Karteikarten"), tx("Photo on the front, key facts on the back. Learn every bike by sight.", "Foto vorne, Fakten hinten. Lerne jedes Bike auf einen Blick."), LEARN.known.length ? LEARN.known.length + "/" + BIKES.length : ""],
    ["practice", t("practice"), tx("Claude plays the customer, you advise and get feedback.", "Claude spielt die Kundschaft, du berätst und bekommst Feedback."), Math.max(LEARN.practice?.best || 0, LEARN.pitch?.best || 0, LEARN.obj?.best || 0) ? tx("best ", "bestes ") + Math.max(LEARN.practice?.best || 0, LEARN.pitch?.best || 0, LEARN.obj?.best || 0) + "/10" : ""]
  ];

  let team = "";
  if (isTeam) {
    const rows = LEARNERS.map(l => { const b = badges(l).filter(x => x.p >= 1).length; return `<tr><td><b>${esc(l.name || "–")}</b><div class="note">${esc((ROLES().find(r => r[0] === l.role) || [0, ""])[1])}</div></td><td class="mono">${l.xp || 0}</td><td class="mono">${(l.known || []).length}/${BIKES.length}</td><td class="mono">${quizPct(l) ?? "–"}${quizPct(l) != null ? "%" : ""} <span class="note">(${(l.quiz || []).length})</span></td><td class="mono">${Math.max(l.practice?.best || 0, l.pitch?.best || 0, l.obj?.best || 0) || "–"}</td><td class="mono">${b}/4${b === 4 ? " ★" : ""}</td><td class="note">${l.updated ? new Date(l.updated).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB") : ""}</td></tr>`; }).join("");
    team = `<div class="vhead" style="margin-top:10px"><h1 style="font-size:24px">${tx("Team progress", "Team-Fortschritt")} · ${LEARNERS.length}</h1></div>
      <div class="card ctable"><table style="table-layout:auto"><thead><tr><th>${tx("Name", "Name")}</th><th>XP</th><th>${tx("Flashcards", "Karteikarten")}</th><th>Quiz</th><th>${tx("Sales", "Verkauf")}</th><th>${tx("Badges", "Abzeichen")}</th><th>${tx("Last active", "Zuletzt")}</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="empty">–</td></tr>`}</tbody></table></div>`;
  }
  v.innerHTML = `<div class="wrap"><div class="vhead"><h1>${tx("Hi", "Hallo")} ${esc(LEARN.name.split(" ")[0])}</h1><p>${roleName ? esc(roleName) + " · " : ""}${LEARN.xp || 0} XP · ${done}/${B.length} ${tx("badges", "Abzeichen")} <button class="back" id="lfEdit" style="display:inline;margin-left:8px">${tx("Change name", "Name ändern")}</button></p>
      <p>${tx("Train with the real product data. Everything earns XP and counts towards your badges.", "Trainiere mit den echten Produktdaten. Alles bringt XP und zählt für deine Abzeichen.")}</p></div>
    ${cert ? `<div class="card certi"><span class="note">BOMBTRACK · KNOWLEDGE &amp; ADVICE</span><b>Bombtrack Certified</b><span>${esc(LEARN.name)}</span><span class="note">${esc(roleName)} · ${new Date().toLocaleDateString(lang === "de" ? "de-DE" : "en-GB")}</span></div>` : ""}
    <h3 class="setgrp">${tx("Start training", "Training starten")}</h3>
    <div class="amods2" id="amods">${mods.map(([k, ti, d, st]) => `<button data-v="${k}"><span class="mic">${AIC[k]}</span><span class="mtx"><b>${esc(ti)}${st ? ` <span class="pill">${esc(st)}</span>` : ""}</b><span class="d">${esc(d)}</span></span><span class="go">${tx("Start", "Starten")} ${AIC.arrow}</span></button>`).join("")}</div>
    <h3 class="setgrp">${tx("Your badges", "Deine Abzeichen")} · ${done}/${B.length}</h3>
    <div class="badges2">${B.map(b => `<div class="bdg2 ${b.p >= 1 ? "on" : ""}">${medal(b.ic, b.p)}<b>${esc(b.t)}</b><span class="note">${esc(b.d)}</span><span class="pct">${b.p >= 1 ? tx("Earned", "Erreicht") : Math.round(Math.min(1, b.p) * 100) + " %"}</span></div>`).join("")}
      <div class="bdg2 cert ${cert ? "on" : ""}">${medal("cert", done / B.length)}<b>Bombtrack Certified</b><span class="note">${tx("All three badges", "Alle drei Abzeichen")}</span><span class="pct">${cert ? tx("Earned", "Erreicht") : done + "/" + B.length}</span></div></div>
    ${team}</div>`;
  $("#amods").onclick = e => { const b = e.target.closest("[data-v]"); if (b) { if (b.dataset.v === "quiz" && qz && qz.i >= qz.qs.length) qz = null; go(b.dataset.v); } };
  $("#lfEdit").onclick = () => { const n = LEARN.name; LEARN.name = ""; if (!needProfile(v, () => render())) LEARN.name = n; const inp = $("#lf_n"); if (inp) { inp.value = n; } };
}

/* ---- riding styles ---- */
const STYLE_TXT = {
  "Gravel & Allroad Bike": {
    en: ["For paved and unpaved roads alike. Drop bars, wide tyres and generous clearance decide how fast or how rough a bike can go.", "Road riders who want to leave the tarmac, commuters who take the long way home, weekend explorers.", ["Which tyres can I fit?", "Can I put bags on it?", "How does it ride on the road?"], "Look at tyre clearance, gearing range and mounts for bags. Steel rides comfortably, aluminium and carbon save weight."],
    de: ["Für Asphalt und Schotter gleichermaßen. Rennlenker, breite Reifen und viel Reifenfreiheit entscheiden, wie schnell oder wie ruppig ein Bike unterwegs sein kann.", "Rennradfahrer, die runter vom Asphalt wollen, Pendler mit Umweg, Entdecker am Wochenende.", ["Welche Reifen passen?", "Kann ich Taschen montieren?", "Wie fährt es sich auf der Straße?"], "Achte auf Reifenfreiheit, Übersetzungsbandbreite und Aufnahmen für Taschen. Stahl fährt komfortabel, Aluminium und Carbon sparen Gewicht."] },
  "Adventure & Touring Bike": {
    en: ["Long trips, often for days or weeks, usually with luggage. The bike has to carry, climb and keep going without trouble.", "Travellers, bikepackers and anyone planning a tour with panniers or bags.", ["How much can it carry?", "Racks and lights included?", "Is the gearing low enough with luggage?"], "Look at approved max weight, rack and bottle mounts, low gearing, dynamo options and a comfortable, stable position."],
    de: ["Lange Touren, oft über Tage oder Wochen, meist mit Gepäck. Das Bike muss tragen, klettern und zuverlässig durchhalten.", "Reisende, Bikepacker und alle, die mit Packtaschen oder Taschen auf Tour gehen.", ["Wie viel darf ich zuladen?", "Gepäckträger und Licht dabei?", "Ist die Übersetzung mit Gepäck leicht genug?"], "Achte auf das zulässige Gesamtgewicht, Gepäckträger- und Flaschenhalter-Aufnahmen, leichte Gänge, Dynamo-Optionen und eine bequeme, stabile Position."] },
  "Mountain Bike": {
    en: ["Built for off-road control: traction, robust parts and handling on rough trails. Not every mountain bike has suspension.", "Trail riders and bikepackers who head into rough terrain.", ["Hardtail or rigid?", "How wide can the tyres be?", "Can I mount a dropper post?"], "Look at tyre size and volume, fork type, head angle and the drivetrain range. Wide plus tyres add grip and comfort without suspension."],
    de: ["Gebaut für Kontrolle im Gelände: Traktion, robuste Teile und Fahrverhalten auf ruppigen Trails. Nicht jedes Mountainbike ist gefedert.", "Trail-Fahrer und Bikepacker, die ins grobe Gelände wollen.", ["Hardtail oder starr?", "Wie breit dürfen die Reifen sein?", "Passt eine Vario-Sattelstütze?"], "Achte auf Reifengröße und Volumen, Gabeltyp, Lenkwinkel und die Bandbreite der Schaltung. Breite Plus-Reifen bringen Grip und Komfort auch ohne Federung."] },
  "Urban Bike": {
    en: ["Everyday riding in the city: practical, robust and easy to live with. Some carry kids or shopping, some are simply quick and simple.", "Commuters, students, families and anyone using the bike every day.", ["Fenders and lights?", "Can it carry a child seat or cargo?", "How much maintenance?"], "Look at mounts, carrying capacity, simple or low-maintenance drivetrains and a comfortable, upright position."],
    de: ["Alltag in der Stadt: praktisch, robust und unkompliziert. Manche tragen Kinder oder Einkäufe, andere sind einfach schnell und schlicht.", "Pendler, Studierende, Familien und alle, die jeden Tag fahren.", ["Schutzbleche und Licht?", "Kindersitz oder Lasten möglich?", "Wie viel Wartung braucht es?"], "Achte auf Aufnahmen, Zuladung, einfache oder wartungsarme Schaltungen und eine bequeme, aufrechte Position."] },
  "Cyclocross Bike": {
    en: ["Short, intense off-road racing: quick, light and nimble, made to be carried over obstacles too. Not the same as a gravel bike for long rides.", "Racers and sporty riders who want a fast, direct bike.", ["How is it different from a gravel bike?", "Which tyres for racing?", "Can I ride it all year?"], "Look at a lively geometry, narrower knobby tyres and good mud clearance."],
    de: ["Kurze, intensive Rennen im Gelände: schnell, leicht und wendig, auch zum Tragen über Hindernisse gemacht. Nicht dasselbe wie ein Gravel-Bike für lange Touren.", "Rennfahrer und sportliche Fahrer, die ein schnelles, direktes Bike wollen.", ["Was ist anders als beim Gravel-Bike?", "Welche Reifen fürs Rennen?", "Kann ich es das ganze Jahr fahren?"], "Achte auf eine lebendige Geometrie, schmalere Stollenreifen und gute Schlammfreiheit."] }
};
/* richer riding-style knowledge: terrain, typical setup, how it differs, counter tip, not ideal for */
const STYLE_MORE = {
  "Gravel & Allroad Bike": {
    en: { terrain: "Tarmac, forest roads, gravel and hardpack paths, the odd easy singletrack. Mixed surfaces in one ride are normal.",
      setup: "Drop bar, often with flare. Tyres roughly 35 to 50 mm, 700c or 650b. Disc brakes, thru axles. 1× drivetrains for simplicity or 2× for closer gear steps. Mounts for bottles, bags and often fenders.",
      differs: "Faster and lighter than an adventure bike, more comfortable and more capable off-road than a road bike. Calmer and longer than a cyclocross bike.",
      tip: "Ask about the share of tarmac versus gravel. Mostly road: narrower tyres and 2×. Rougher tracks or bags: more tyre clearance and lower gears.",
      notfor: "Technical mountain bike trails, heavy loaded touring over weeks, or riders who never leave the tarmac." },
    de: { terrain: "Asphalt, Forstwege, Schotter und feste Pfade, gelegentlich ein einfacher Singletrail. Wechselnde Untergründe auf einer Runde sind normal.",
      setup: "Drop Bar, oft mit Flare. Reifen etwa 35 bis 50 mm, 700c oder 650b. Scheibenbremsen, Steckachsen. 1-fach-Antrieb für Einfachheit oder 2-fach für feinere Gangsprünge. Aufnahmen für Flaschen, Taschen und oft Schutzbleche.",
      differs: "Schneller und leichter als ein Adventure-Bike, bequemer und geländetauglicher als ein Rennrad. Ruhiger und länger als ein Cyclocross-Bike.",
      tip: "Frag nach dem Anteil Asphalt zu Schotter. Viel Straße: schmalere Reifen und 2-fach. Gröbere Wege oder Taschen: mehr Reifenfreiheit und leichtere Gänge.",
      notfor: "Technische Mountainbike-Trails, wochenlange Reisen mit viel Gepäck oder Leute, die nie den Asphalt verlassen." } },
  "Adventure & Touring Bike": {
    en: { terrain: "Everything a long trip brings: roads, gravel, bad tracks, mountain passes, usually with luggage. Comfort and reliability matter more than speed.",
      setup: "Steel frames are common because they are robust and repairable. Racks and many mounts, sometimes dynamo lights. Wide tyres, low gearing for climbing with load, strong wheels and a stable, longer geometry.",
      differs: "More load capacity, lower gears and calmer steering than a gravel bike. Less agile and heavier, but made to keep going day after day.",
      tip: "Ask how much luggage and how long the trips are. Check the maximum system weight, rack mounts and whether the lowest gear is light enough with bags.",
      notfor: "Fast group rides, racing, or someone who wants the lightest possible bike." },
    de: { terrain: "Alles, was eine lange Reise mit sich bringt: Straße, Schotter, schlechte Wege, Pässe, meist mit Gepäck. Komfort und Zuverlässigkeit zählen mehr als Tempo.",
      setup: "Oft Stahlrahmen, weil robust und reparierbar. Gepäckträger und viele Aufnahmen, teils Nabendynamo-Licht. Breite Reifen, leichte Übersetzung zum Klettern mit Last, stabile Laufräder und eine ruhige, längere Geometrie.",
      differs: "Mehr Zuladung, leichtere Gänge und ruhigeres Lenkverhalten als ein Gravel-Bike. Weniger wendig und schwerer, dafür gemacht für Tag um Tag unterwegs.",
      tip: "Frag nach Gepäckmenge und Tourlänge. Prüfe maximales Systemgewicht, Gepäckträgeraufnahmen und ob der leichteste Gang mit Taschen reicht.",
      notfor: "Schnelle Gruppenausfahrten, Rennen oder wer das leichteste mögliche Rad sucht." } },
  "Mountain Bike": {
    en: { terrain: "Trails, roots, rocks and steep sections, plus off-road bikepacking routes. Grip and control come first.",
      setup: "Flat bar, wide tyres (often 2.25 inch and more, 29 inch or 27.5+), rigid or suspension fork, slacker head angle, 1× drivetrain with a wide range. Often dropper post compatible and with mounts for bags.",
      differs: "Much more grip, control and comfort off-road than gravel bikes, but slower on tarmac. Rigid and hardtail bikes are simpler and lighter than full suspension.",
      tip: "Ask what the hardest terrain is and whether they carry bags. Rigid or hardtail suits bikepacking and flowing trails; very rough trails need suspension.",
      notfor: "Mostly road riding, fast commuting on tarmac, or riders who want drop bars." },
    de: { terrain: "Trails, Wurzeln, Steine und steile Passagen, dazu Bikepacking-Routen im Gelände. Grip und Kontrolle stehen an erster Stelle.",
      setup: "Flatbar, breite Reifen (oft 2.25 Zoll und mehr, 29 Zoll oder 27.5+), Starr- oder Federgabel, flacherer Lenkwinkel, 1-fach-Antrieb mit großer Bandbreite. Oft vorbereitet für Vario-Sattelstützen und mit Aufnahmen für Taschen.",
      differs: "Viel mehr Grip, Kontrolle und Komfort im Gelände als ein Gravel-Bike, dafür langsamer auf Asphalt. Starr- und Hardtail-Bikes sind einfacher und leichter als Fullys.",
      tip: "Frag nach dem schwierigsten Gelände und ob Taschen mitkommen. Starr oder Hardtail passt zu Bikepacking und flowigen Trails, sehr ruppige Trails brauchen Federung.",
      notfor: "Überwiegend Straße, schnelles Pendeln auf Asphalt oder wer einen Rennlenker möchte." } },
  "Urban Bike": {
    en: { terrain: "City streets, bike paths, cobbles and curbs, in every weather. Often short rides, many stops, sometimes kids or shopping on board.",
      setup: "Upright or moderate position, robust wheels and puncture resistant tyres, simple drivetrains (singlespeed or hub gears are common), fenders, lights and racks or cargo options depending on the model.",
      differs: "More practical and lower maintenance than sporty bikes. Cargo and longtail bikes carry kids and loads that a normal bike cannot.",
      tip: "Ask about distance, weather, parking and what has to be carried. Low maintenance, lights and fenders often matter more than weight.",
      notfor: "Long sporty rides, rough off-road trails or racing." },
    de: { terrain: "Stadtstraßen, Radwege, Kopfsteinpflaster und Bordsteine, bei jedem Wetter. Oft kurze Wege, viele Stopps, manchmal Kinder oder Einkäufe an Bord.",
      setup: "Aufrechte oder moderate Sitzposition, robuste Laufräder und pannensichere Reifen, einfache Antriebe (Singlespeed oder Nabenschaltung sind häufig), Schutzbleche, Licht und je nach Modell Gepäckträger oder Lastenoptionen.",
      differs: "Praktischer und wartungsärmer als sportliche Räder. Lasten- und Longtail-Bikes tragen Kinder und Lasten, die ein normales Rad nicht schafft.",
      tip: "Frag nach Strecke, Wetter, Abstellplatz und was transportiert werden muss. Wenig Wartung, Licht und Schutzbleche zählen oft mehr als Gewicht.",
      notfor: "Lange sportliche Runden, grobe Trails oder Rennen." } },
  "Cyclocross Bike": {
    en: { terrain: "Short laps on grass, mud, sand and forest, with obstacles where riders carry the bike. Also fast training on gravel.",
      setup: "Drop bar, about 33 mm tyres for racing (UCI rule), light and stiff frame, quick handling, higher bottom bracket, clearance for mud. Often 1× drivetrain.",
      differs: "Shorter, quicker and more race focused than a gravel bike, with less tyre clearance and fewer mounts. Less comfortable on long rides.",
      tip: "Ask if they want to race. For racing: CX geometry and 33 mm tyres. For long rides and bags a gravel bike is usually the better choice.",
      notfor: "Touring, bikepacking with bags, or relaxed long rides." },
    de: { terrain: "Kurze Runden auf Wiese, Matsch, Sand und Wald, mit Hindernissen, über die das Rad getragen wird. Auch schnelles Training auf Schotter.",
      setup: "Drop Bar, für Rennen etwa 33 mm Reifen (UCI-Regel), leichter und steifer Rahmen, direktes Handling, höheres Tretlager, Platz für Matsch. Oft 1-fach-Antrieb.",
      differs: "Kürzer, direkter und rennorientierter als ein Gravel-Bike, mit weniger Reifenfreiheit und weniger Aufnahmen. Auf langen Touren weniger bequem.",
      tip: "Frag, ob Rennen geplant sind. Fürs Rennen: CX-Geometrie und 33 mm Reifen. Für lange Touren und Taschen ist ein Gravel-Bike meist die bessere Wahl.",
      notfor: "Reisen, Bikepacking mit Taschen oder entspannte lange Touren." } }
};
let stSel = CATS[0];
function viewStyles(v) {
  v.style.padding = "";
  /* reference page: no name needed */
  const bikes = BIKES.filter(p => stylesOf(p).includes(stSel)), tx2 = STYLE_TXT[stSel][lang];
  const tires = bikes.map(stockTire).filter(Boolean).map(x => x[0]), mats = [...new Set(bikes.map(material))], has = [...new Set(bikes.map(p => p.fam))];
  const ha = bikes.map(p => geoM(p, "HEAD ANGLE")).filter(x => x), maxw = bikes.map(p => (specVal(p, RX.maxw, "en").match(/(\d+)\s*kg/) || [])[1]).filter(Boolean).map(Number);
  const done = !!(LEARN && LEARN.lessons || {})[stSel];
  v.innerHTML = `<div class="wrap"><div class="vhead"><h1>${tx("Riding styles", "Fahrstile")}</h1><p>${tx("Five ways to ride, and which Bombtrack fits each. The numbers come straight from Bombtrack's data.", "Fünf Arten zu fahren, und welches Bombtrack jeweils passt. Die Zahlen kommen direkt aus Bombtracks Daten.")}</p></div>
    <div class="chips" id="stc">${CATS.map(c => `<button class="chip" data-c="${esc(c)}" aria-pressed="${c === stSel}">${(LEARN && LEARN.lessons || {})[c] ? "✓ " : ""}${esc(catName(c))}</button>`).join("")}</div>
    <div class="card lesson"><h2>${esc(catName(stSel))}</h2><p class="lead">${esc(tx2[0])}</p>
      <div class="lgrid"><div><span class="note">${tx("Who rides it", "Wer fährt das")}</span><p>${esc(tx2[1])}</p></div><div><span class="note">${tx("What matters", "Worauf es ankommt")}</span><p>${esc(tx2[3])}</p></div></div>
      ${(() => { const m = (STYLE_MORE[stSel] || {})[lang] || (STYLE_MORE[stSel] || {}).en; return m ? `<div class="lgrid more">
        <div><span class="note">${tx("Terrain", "Gelände")}</span><p>${esc(m.terrain)}</p></div>
        <div><span class="note">${tx("Typical setup", "Typische Ausstattung")}</span><p>${esc(m.setup)}</p></div>
        <div><span class="note">${tx("How it differs", "Abgrenzung")}</span><p>${esc(m.differs)}</p></div>
        <div><span class="note">${tx("Not ideal for", "Weniger geeignet für")}</span><p>${esc(m.notfor)}</p></div></div>
        <div class="card tipbox"><span class="note">${tx("Counter tip", "Tipp für die Beratung")}</span><p>${esc(m.tip)}</p></div>` : ""; })()}
      <div class="tiles">${[[bikes.length, tx("Bombtrack bikes", "Bombtrack-Bikes")], [tires.length ? (Math.min(...tires) === Math.max(...tires) ? Math.min(...tires) : Math.min(...tires) + "–" + Math.max(...tires)) + " mm" : "–", tx("tyre width from the factory", "Reifenbreite ab Werk")], [ha.length ? (Math.min(...ha) === Math.max(...ha) ? Math.min(...ha) : Math.min(...ha) + "–" + Math.max(...ha)) + "°" : "–", tx("head angle (M)", "Lenkwinkel (M)")], [maxw.length ? Math.max(...maxw) + " kg" : "–", tx("max. rider weight incl. luggage", "max. Gesamtgewicht inkl. Gepäck")]].map(([b, s]) => `<div class="card tile"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>
      <div><span class="note">${tx("Frame materials", "Rahmenmaterial")}: ${esc(mats.join(", "))} · ${tx("Families", "Familien")}: ${esc(has.join(", "))}</span></div>
      <div><span class="note">${tx("Typical questions at the counter", "Typische Fragen an der Theke")}</span><div class="chips" style="margin-top:6px">${tx2[2].map(q => `<button class="chip" data-ask="${esc(q + " (" + catName(stSel) + ")")}">${esc(q)}</button>`).join("")}</div></div>
      <div class="grid" id="stb" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${bikes.map(p => `<button class="pc" data-h="${esc(p.h)}"><div class="art ${p.img ? "photo" : ""}">${cardArt(p)}</div><b style="font-size:15px">${esc(p.t)}</b><span class="meta">${esc(material(p))}</span></button>`).join("")}</div>
      <div class="chips"><button class="btn" id="stQuiz">${tx("Quiz on this style", "Quiz zu diesem Stil")}</button></div>
    </div></div>`;
  $("#stc").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { stSel = b.dataset.c; render(); } };
  $("#stb").onclick = e => { const b = e.target.closest("[data-h]"); if (b) go("product", { h: b.dataset.h }); };
  v.querySelector(".lesson").addEventListener("click", e => { const b = e.target.closest("[data-ask]"); if (b) { newChat(); go("chat", { prefill: b.dataset.ask }); } });
  $("#stDone") && ($("#stDone").onclick = () => { if (LEARN && LEARN.name && !LEARN.lessons[stSel]) { LEARN.lessons[stSel] = Date.now(); addXP(20); } const i = CATS.indexOf(stSel); if (i < CATS.length - 1) stSel = CATS[i + 1]; render(); });
  $("#stQuiz").onclick = () => { qz = newQuiz(stSel); go("quiz"); };
}

/* ---- range map & families ---- */
let rmSel = null;
function viewRange(v) {
  v.style.padding = "";
  /* reference page: no name needed */
  markVisit("range");
  const sel = null;
  const fams = [...new Set(BIKES.map(p => p.fam))];
  const famHtml = fams.map(f => { const ms = BIKES.filter(p => p.fam === f); const plats = [...new Set(ms.map(p => p.g || p.h))];
    const rows = [[tx("Frame", "Rahmen"), p => material(p) + (G[p.g] ? " · " + G[p.g].title : "")], [tx("Drivetrain", "Antrieb"), p => { const d = TD[p.h]; return d && d.rings.length && d.cogs ? `${d.rings.join("/")}T × ${d.cogs[0] === d.cogs[1] ? d.cogs[0] + "T (Singlespeed)" : d.cogs[0] + "–" + d.cogs[1] + "T"}` : "–"; }], [tx("Brakes", "Bremsen"), p => specVal(p, RX.brakes) || "–"], [tx("Tyres (M)", "Reifen (M)"), p => { const t2 = stockTire(p); return t2 ? t2[0] + "-" + t2[1] : "–"; }], [tx("Weight", "Gewicht"), p => kg(p) ? kg(p) + " kg" : "–"], [tx("Extras", "Extras"), p => [specVal(p, RX.rack) && tx("rack", "Gepäckträger"), specVal(p, RX.light) && tx("lights", "Licht")].filter(Boolean).join(", ") || "–"]];
    return `<details class="card fam" ${f === "Arise" ? "open" : ""}><summary><b>${esc(f)}</b> <span class="note">${ms.length} ${tx("bikes", "Bikes")} · ${plats.length === 1 ? tx("one frame, different builds", "ein Rahmen, verschiedene Ausstattungen") : plats.length + " " + tx("frame platforms", "Rahmen-Plattformen")}</span></summary>
      <div class="ctable"><table><thead><tr><th></th>${ms.map(p => `<th>${p.img ? `<img src="${p.img}" alt="">` : ""}<button class="back" style="color:var(--ink);font-weight:700" data-h="${esc(p.h)}">${esc(p.t)}</button></th>`).join("")}</tr></thead><tbody>${rows.map(([lab, fn]) => { const vals = ms.map(fn); const diff = new Set(vals).size > 1; return `<tr class="${diff ? "diff" : ""}"><td>${esc(lab)}</td>${vals.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div></details>`; }).join("");
  const drv = p => { const d = TD[p.h]; if (!d || !d.rings.length || !d.cogs) return ""; return d.cogs[0] === d.cogs[1] ? "Singlespeed" : (d.rings.length === 1 ? "1×" : d.rings.length + "×") + " " + d.cogs[0] + "–" + d.cogs[1] + "T"; };
  const facts = p => { const t2 = stockTire(p); return [material(p), drv(p), t2 ? tx("tyres", "Reifen") + " " + t2[0] + " mm" : ""].filter(Boolean).join(" · "); };
  const rowsHtml = CATS.map(c => { const ms = BIKES.filter(p => stylesOf(p).includes(c)); if (!ms.length) return ""; const fs = [...new Set(ms.map(p => p.fam))];
    const st = (STYLE_TXT[c] || {})[lang] || (STYLE_TXT[c] || {}).en || [""];
    return `<section class="erow"><div class="ehead"><h2>${esc(catName(c))}</h2><span class="note">${ms.length} ${tx("bikes", "Bikes")} · ${fs.length} ${fs.length === 1 ? tx("family", "Familie") : tx("families", "Familien")}</span><p>${esc(st[0])}</p>${(() => { const m = (STYLE_MORE[c] || {})[lang] || (STYLE_MORE[c] || {}).en; return m ? `<p class="eterr"><b>${tx("Terrain", "Gelände")}:</b> ${esc(m.terrain)}</p>` : ""; })()}<button class="back" data-style="${esc(c)}">${tx("More about this style", "Mehr zu diesem Fahrstil")} →</button></div>
      <div class="ecards">${fs.map(f => { const fm = ms.filter(p => p.fam === f); const lead = fm.find(p => p.img) || fm[0];
        return `<div class="card ecard"><button class="eimg" data-open="${esc(lead.h)}">${lead.img ? `<img src="${lead.img}" alt="" loading="lazy">` : ""}</button><div class="ebody"><b class="efam">${esc(f)}</b>
          <ul>${fm.map(p => `<li><button data-open="${esc(p.h)}"><span class="em">${esc(p.t)}</span><span class="ef">${esc(facts(p))}${stylesOf(p).length > 1 ? ` · ${tx("also", "auch")} ${esc(stylesOf(p).filter(x => x !== c).map(catName).join(", "))}` : ""}</span></button></li>`).join("")}</ul></div></div>`; }).join("")}</div></section>`; }).join("");
  v.innerHTML = `<div class="wrap"><div class="vhead"><h1>${tx("Range by riding style", "Sortiment nach Einsatz")}</h1><p>${tx("How the Bombtrack range is built: for each riding style the families and their models, with what sets each model apart. Tap a model to open it.", "So ist das Bombtrack-Sortiment aufgebaut: pro Fahrstil die Familien und ihre Modelle, mit dem, was jedes Modell unterscheidet. Tippe ein Modell an, um es zu öffnen.")}</p></div>
    ${rowsHtml}
    <div class="vhead" style="margin-top:8px"><h1 style="font-size:24px">${tx("Model families", "Modellfamilien")}</h1><p>${tx("Bikes in a family share a name and often a frame. Highlighted rows show what differs.", "Bikes einer Familie teilen sich den Namen und oft den Rahmen. Markierte Zeilen zeigen, was sich unterscheidet.")}</p></div>
    <div style="display:flex;flex-direction:column;gap:10px" id="fams">${famHtml}</div></div>`;
  v.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (o) go("product", { h: o.dataset.open }); const st2 = e.target.closest("[data-style]"); if (st2) { stSel = st2.dataset.style; go("styles"); } });
  $("#fams").onclick = e => { const b = e.target.closest("[data-h]"); if (b) go("product", { h: b.dataset.h }); };
  $("#fams").addEventListener("toggle", () => markVisit("families"), true);
}

/* ---- quiz ---- */
let qz = null;
function qPhoto(pool) { const p = pickN(pool.filter(x => x.img), 1)[0]; if (!p) return null; const wrong = pickN(BIKES.filter(x => x.h !== p.h && x.fam !== p.fam), 2).concat(pickN(BIKES.filter(x => x.h !== p.h && x.fam === p.fam), 1)); const opts = shuffle([p, ...wrong].slice(0, 4)); return { q: tx("Which bike is this?", "Welches Bike ist das?"), img: p.img, opts: opts.map(o => o.t), a: p.t, why: `${p.t}: ${catName(p.cat)}, ${material(p)}.`, h: p.h }; }
function qCat(pool) { const p = pickN(pool, 1)[0]; const st = stylesOf(p).map(catName); const right = st[Math.floor(Math.random() * st.length)]; return { q: tx(`Which riding style is the ${p.t} made for?`, `Für welchen Fahrstil ist das ${p.t} gemacht?`), img: p.img, opts: shuffle([right, ...pickN(CATS.map(catName).filter(c => !st.includes(c)), 3)]), a: right, why: tx(`Bombtrack lists the ${p.t} under ${st.join(" and ")}.`, `Bombtrack führt das ${p.t} unter ${st.join(" und ")}.`), h: p.h }; }
function qPair(pool, getter, qEN, qDE, unit, more = true) { const c = pool.map(p => [p, getter(p)]).filter(x => x[1] != null); for (let k = 0; k < 20; k++) { const [a, b] = pickN(c, 2); if (!a || !b) return null; if (Math.abs(a[1] - b[1]) >= (unit === "kg" ? .4 : unit === "°" ? .5 : 3)) { const win = (more ? a[1] > b[1] : a[1] < b[1]) ? a : b; return { q: tx(qEN, qDE), opts: [a[0].t, b[0].t], a: win[0].t, why: `${a[0].t}: ${a[1]}${unit} · ${b[0].t}: ${b[1]}${unit}`, h: win[0].h }; } } return null; }
function qFits(pool) { const c = pool.filter(p => TD[p.h]); for (let k = 0; k < 20; k++) { const p = pickN(c, 1)[0]; const fr = pickGroup(TD[p.h].frame, "M"); const t2 = fr && fr.t[0]; if (!t2) continue; const w = t2[0] + (Math.random() < .5 ? -2 : 6); const ok = w <= t2[0]; return { q: tx(`Does a ${w}-${t2[1]} tyre fit the ${p.t} (size M, without fenders)?`, `Passt ein ${w}-${t2[1]} Reifen ans ${p.t} (Größe M, ohne Schutzbleche)?`), opts: [tx("Yes", "Ja"), tx("No", "Nein")], a: ok ? tx("Yes", "Ja") : tx("No", "Nein"), why: tx(`Max. frame clearance: ${t2[0]}-${t2[1]}.`, `Max. Reifenfreiheit Rahmen: ${t2[0]}-${t2[1]}.`), h: p.h }; } return null; }
function qHanger(pool) { const c = pool.map(p => [p, (p.en.x["Spare Parts"] || {})["Derailleur hanger"]]).filter(x => x[1] && /BT-DH-\d+/.test(x[1])); if (c.length < 2) return null; const [p, code] = pickN(c, 1)[0]; const codes = [...new Set(c.map(x => x[1].match(/BT-DH-\d+/)[0]))].filter(x => x !== code.match(/BT-DH-\d+/)[0]); const right = code.match(/BT-DH-\d+/)[0]; return { q: tx(`Which derailleur hanger fits the ${p.t}?`, `Welches Schaltauge passt ans ${p.t}?`), opts: shuffle([right, ...pickN(codes, 3)]), a: right, why: tx(`Spare parts list of the ${p.t}: ${code}.`, `Ersatzteilliste des ${p.t}: ${code}.`), h: p.h }; }
function qMat(pool) { const p = pickN(pool, 1)[0]; const m = material(p); if (m === "–") return null; return { q: tx(`What is the frame of the ${p.t} made of?`, `Aus welchem Material ist der Rahmen des ${p.t}?`), img: p.img, opts: [tx("Steel", "Stahl"), tx("Aluminium", "Aluminium"), "Carbon", tx("Titanium", "Titan")], a: m, why: specVal(p, RX.frame), h: p.h }; }
function qGear(pool) { const c = pool.map(p => { const g = gearOf(p); return g ? [p, +(gearCalc(g).loGI).toFixed(1)] : null; }).filter(Boolean); for (let k = 0; k < 20; k++) { const [a, b] = pickN(c, 2); if (a && b && Math.abs(a[1] - b[1]) > 2.5) { const win = a[1] < b[1] ? a : b; return { q: tx("Which bike has the easier lowest gear for steep climbs?", "Welches Bike hat den leichteren kleinsten Gang für steile Anstiege?"), opts: [a[0].t, b[0].t], a: win[0].t, why: `${a[0].t}: ${a[1]}″ · ${b[0].t}: ${b[1]}″ (${tx("gear inches, lower = easier", "Gear Inches, niedriger = leichter")})`, h: win[0].h }; } } return null; }
/* ---- quiz by product category ---- */
const FRAMES = P.filter(p => p.k === "frameset"), PARTS = P.filter(p => p.k === "part"), GEAR = P.filter(p => p.k === "apparel" || p.k === "accessory");
const QKINDS = () => [["", tx("Everything mixed", "Alles gemischt"), tx("Bikes, framesets and parts in one round", "Bikes, Rahmensets und Teile in einer Runde")],
  ["k:bike", tx("Complete bikes", "Komplettbikes"), tx("Photos, riding styles, materials, gearing, geometry", "Fotos, Fahrstile, Material, Übersetzung, Geometrie")],
  ["k:frameset", tx("Framesets", "Rahmensets"), tx("Frame material, weights, BB standards, riding styles", "Rahmenmaterial, Gewichte, Tretlager-Standards, Fahrstile")],
  ["k:part", tx("Spare parts", "Ersatzteile"), tx("Part codes, hangers and thru axles per bike", "Teilenummern, Schaltaugen und Steckachsen pro Bike")],
  ["k:gear", tx("Accessories & apparel", "Zubehör & Bekleidung"), tx("Recognise jerseys, shirts, socks and bottles", "Trikots, Shirts, Socken und Flaschen erkennen")]];
const quizLabel = c => !c ? tx("Everything mixed", "Alles gemischt") : c.startsWith("k:") ? (QKINDS().find(x => x[0] === c) || [0, c])[1] : catName(c);
const CODE_TYPES = () => ({ DH: tx("Derailleur hanger / dropout", "Schaltauge / Ausfallende"), HC: tx("Hub end caps", "Nabenendkappen"), TA: tx("Thru axle", "Steckachse"), CR: tx("Cable guides / frame hardware", "Kabelführung / Rahmenkleinteile"), CB: tx("Cassette body", "Freilaufkörper"), CRP: tx("Crank bolt", "Kurbelschraube"), HA: tx("Hub axle", "Nabenachse"), SC: tx("Seat clamp", "Sattelklemme"), MG: tx("Mudguard part", "Schutzblech-Teil"), FK: tx("Fork", "Gabel") });
const codeOf = s => (String(s).match(/BT-\s?([A-Z]{2,3})/) || [])[1];
function qSpare(field, en, de) { const c = BIKES.map(p => [p, String(((p.en.x || {})["Spare Parts"] || {})[field] || "").replace(/\s*\|\s*$/, "").trim()]).filter(x => x[1] && /BT-/.test(x[1])); if (c.length < 4) return null;
  const [p, val] = pickN(c, 1)[0]; const others = [...new Set(c.map(x => x[1]))].filter(x => x !== val); if (others.length < 2) return null;
  return { q: tx(`${en} for the ${p.t}?`, `${de} beim ${p.t}?`), img: p.img, opts: shuffle([val, ...pickN(others, 3)]), a: val, why: tx(`Spare parts list of the ${p.t}: ${field} ${val}.`, `Ersatzteilliste des ${p.t}: ${val}.`), h: p.h }; }
function qCode() { const T = CODE_TYPES(); const c = PARTS.filter(p => T[codeOf(p.t)]); const p = pickN(c, 1)[0]; if (!p) return null; const code = codeOf(p.t); const right = T[code];
  return { q: tx(`What kind of part has a code starting with BT-${code}?`, `Welches Teil hat eine Nummer, die mit BT-${code} beginnt?`), img: p.img, opts: shuffle([right, ...pickN(Object.values(T).filter(x => x !== right), 3)]), a: right, why: `${p.t}`, h: p.h }; }
function qPartFor() { const c = BIKES.map(p => [p, ((p.en.x || {})["Spare Parts"] || {})["Derailleur hanger"]]).filter(x => x[1] && /BT-DH-\d+/.test(x[1])); if (c.length < 4) return null;
  const [p, code] = pickN(c, 1)[0]; const right = p.t; const wrong = pickN(c.filter(x => x[1] !== code && x[0].fam !== p.fam).map(x => x[0].t), 3); if (wrong.length < 3) return null;
  return { q: tx(`Which bike uses derailleur hanger ${code}?`, `Welches Bike nutzt das Schaltauge ${code}?`), opts: shuffle([right, ...wrong]), a: right, why: tx(`${code} is listed for the ${p.t}.`, `${code} steht in der Ersatzteilliste des ${p.t}.`), h: p.h }; }
function qPhotoOf(pool, en, de, why) { const p = pickN(pool.filter(x => x.img), 1)[0]; if (!p) return null; const same = pool.filter(x => x.h !== p.h && x.cat === p.cat), other = pool.filter(x => x.h !== p.h && x.cat !== p.cat);
  const wrong = pickN(same, 2).concat(pickN(other, 3)).filter((x, i, a) => a.findIndex(y => y.t === x.t) === i && x.t !== p.t).slice(0, 3); if (wrong.length < 2) return null;
  return { q: tx(en, de), img: p.img, opts: shuffle([p.t, ...wrong.map(x => x.t)]), a: p.t, why: why ? why(p) : p.t, h: p.h }; }
const frameStyle = p => catName(String(p.cat).replace(/ Frameset$/, " Bike"));
function qFrameStyle() { const p = pickN(FRAMES, 1)[0]; if (!p) return null; const right = frameStyle(p);
  return { q: tx(`Which riding style is the ${p.t} made for?`, `Für welchen Fahrstil ist das ${p.t} gemacht?`), img: p.img, opts: shuffle([right, ...pickN(CATS.map(catName).filter(c => c !== right), 3)]), a: right, why: tx(`Bombtrack lists it as ${p.cat}.`, `Bombtrack führt es als ${p.cat}.`), h: p.h }; }
const frameG = p => { const w = specVal(p, /^(weight frame|gewicht rahmen)/i, "en"); const m = String(w).match(/(\d{3,4})\s*g/); return m ? +m[1] : null; };
const bbOf = p => { const f = specVal(p, RX.frame, "en"); const m = f.match(/(\d{2}(?:\.\d)?)\s*mm\s*(BSA|T47|PF\s?\d*|BB\d+)/i); return m ? `${m[2].toUpperCase().replace(/\s/g, "")} ${m[1]} mm` : null; };
function qBB() { const c = FRAMES.map(p => [p, bbOf(p)]).filter(x => x[1]); const all = [...new Set(c.map(x => x[1]))]; if (all.length < 2) return null; const [p, bb] = pickN(c, 1)[0];
  const opts = shuffle([bb, ...pickN(all.filter(x => x !== bb), 2), ...(all.length < 4 ? ["PF30 68 mm"] : [])].slice(0, 4));
  return { q: tx(`Which bottom bracket shell does the ${p.t} have?`, `Welches Tretlagergehäuse hat das ${p.t}?`), img: p.img, opts, a: bb, why: specVal(p, RX.frame), h: p.h }; }
function qGearType() { const DE = { "T-Shirt": "T-Shirt", "Sock": "Socken", "Short Sleeve Cycling Jersey": "Kurzarm-Trikot", "Long Sleeve Cycling Jersey": "Langarm-Trikot", "Button-Up Shirt": "Hemd", "Cap": "Cap", "Leg Warmer": "Beinlinge", "Bib Short": "Trägerhose", "Bottle": "Trinkflasche" };
  const nm = c => lang === "de" ? (DE[c] || c) : c; const p = pickN(GEAR.filter(x => x.img && x.cat), 1)[0]; if (!p) return null; const cats = [...new Set(GEAR.map(x => x.cat).filter(Boolean))];
  return { q: tx("What kind of product is this?", "Was für ein Produkt ist das?"), img: p.img, opts: shuffle([nm(p.cat), ...pickN(cats.filter(c => c !== p.cat).map(nm), 3)]), a: nm(p.cat), why: p.t, h: p.h }; }
const catBar = (cur, id) => `<div class="chips catbar" id="${id}">${QKINDS().filter(k => k[0]).map(([k, l]) => `<button class="chip" data-kc="${k}" aria-pressed="${cur === k}">${esc(l)}</button>`).join("")}</div>`;
const fitsBikes = code => BIKES.filter(b => Object.values(((b.en.x || {})["Spare Parts"] || {})).some(v => String(v).includes(code))).map(b => b.t);
function gensFor(cat) {
  if (cat === "k:frameset") return [() => qPhotoOf(FRAMES, "Which frameset is this?", "Welches Rahmenset ist das?", p => `${p.t}: ${material(p)}`), () => qMat(FRAMES), () => qFrameStyle(), () => qBB(),
    () => qPair(FRAMES, frameG, "Which frame is lighter (size M)?", "Welcher Rahmen ist leichter (Größe M)?", " g", false)];
  if (cat === "k:part") return [() => qCode(), () => qPartFor(), () => qSpare("Derailleur hanger", "Which derailleur hanger is right", "Welches Schaltauge ist richtig"),
    () => qSpare("Through axle front", "Which front thru axle is right", "Welche Steckachse vorne ist richtig"), () => qSpare("Through axle rear", "Which rear thru axle is right", "Welche Steckachse hinten ist richtig"),
    () => qSpare("Cassette body", "Which cassette body is right", "Welcher Freilaufkörper ist richtig"), () => qSpare("Hub end caps front", "Which front hub end caps are right", "Welche Nabenendkappen vorne sind richtig")];
  if (cat === "k:gear") return [() => qPhotoOf(GEAR, "Which product is this?", "Welches Produkt ist das?"), () => qGearType()];
  return null;
}
function newQuiz(cat) {
  const style = cat && !cat.startsWith("k:"); const pool = style ? BIKES.filter(p => stylesOf(p).includes(cat)) : BIKES; const big = pool.length >= 4 ? pool : BIKES;
  let gens = gensFor(cat || "") || [() => qPhoto(big), () => qCat(BIKES), () => qMat(big), () => qFits(big), () => qHanger(BIKES), () => qGear(big),
    () => qPair(big, p => stockTire(p)?.[0] ?? null, "Which bike comes with wider stock tyres?", "Welches Bike hat breitere Serienreifen?", " mm"),
    () => qPair(big, p => geoM(p, "REACH"), "Which bike has the longer reach in size M (more stretched)?", "Welches Bike hat in Größe M mehr Reach (gestreckter)?", " mm"),
    () => qPair(big, kg, "Which bike is lighter?", "Welches Bike ist leichter?", " kg", false),
    () => qPair(big, p => geoM(p, "HEAD ANGLE"), "Which bike has the slacker head angle (calmer steering)?", "Welches Bike hat den flacheren Lenkwinkel (ruhigere Lenkung)?", "°", false)];
  if (!cat) gens = gens.slice(0, 7).concat(gensFor("k:frameset").slice(0, 3), gensFor("k:part").slice(0, 3));
  const cap = Math.max(2, Math.ceil(10 / gens.length) + 1);
  const qs = []; let guard = 0, order = [], used = {};
  while (qs.length < 10 && guard++ < 120) {
    if (!order.length) order = shuffle(gens.map((_, i) => i));
    const gi = order.shift(); if ((used[gi] || 0) >= cap) continue;
    const q = gens[gi](); if (q && !qs.some(x => x.q === q.q && x.a === q.a)) { qs.push(q); used[gi] = (used[gi] || 0) + 1; }
  }
  return { cat, qs, i: 0, c: 0, ans: null, saved: false };
}
function viewQuiz(v) {
  v.style.padding = "";
  if (needProfile(v)) return;
  if (!qz) {
    v.innerHTML = `<div class="wrap"><div class="vhead"><div class="ttl"><span class="mic">${AIC.quiz}</span><h1>${tx("Quiz", "Quiz")}</h1></div><p>${tx("10 questions per round from the real product data. Pick what you want to be quizzed on and the round starts right away.", "10 Fragen pro Runde aus den echten Produktdaten. Wähle, worüber du gefragt werden willst, und die Runde startet sofort.")}</p></div>
      <h3 class="setgrp">${tx("Start a round: product category", "Runde starten: Produktkategorie")}</h3>
      <div class="hub qhub" id="qk">${QKINDS().map(([k, l, d]) => `<button data-q="${k}"><b>${esc(l)}</b><span class="d">${esc(d)}</span></button>`).join("")}</div>
      <h3 class="setgrp">${tx("Or by riding style", "Oder nach Fahrstil")}</h3>
      <div class="chips" id="qs">${CATS.map(c => `<button class="chip" data-q="${esc(c)}">${esc(catName(c))}</button>`).join("")}</div></div>`;
    v.querySelectorAll("#qk,#qs").forEach(el => el.onclick = e => { const b = e.target.closest("[data-q]"); if (b) { qz = newQuiz(b.dataset.q || null); render(); } });
    return;
  }
  const q = qz.qs[qz.i];
  if (!q) {
    if (!qz.saved) { qz.saved = true; LEARN.quiz.push({ ts: Date.now(), c: qz.c, n: qz.qs.length, cat: qz.cat || "" }); LEARN.quiz = LEARN.quiz.slice(-50); addXP(qz.c * 10); }
    const pct = Math.round(qz.c / qz.qs.length * 100);
    v.innerHTML = `<div class="wrap" style="max-width:640px"><div class="card" style="padding:24px;display:flex;flex-direction:column;gap:10px;align-items:flex-start"><span class="note">${tx("Quiz done", "Quiz geschafft")}${" · " + esc(quizLabel(qz.cat))}</span><div class="score">${qz.c}<span class="muted" style="font-size:22px">/${qz.qs.length}</span></div><p style="margin:0">${pct >= 80 ? tx("Great. That counts towards your Quiz pro badge.", "Stark. Das zählt für dein Abzeichen Quiz-Profi.") : tx("Good start. 80% or more counts towards the badge.", "Guter Anfang. Ab 80 % zählt es fürs Abzeichen.")} +${qz.c * 10} XP</p>
      <div class="chips"><button class="btn primary" id="qAgain">${tx("New quiz", "Neues Quiz")}</button><button class="btn" id="qOther">${tx("Other category", "Andere Kategorie")}</button><button class="btn" id="qBack">${tx("Back to Academy", "Zur Academy")}</button></div></div></div>`;
    $("#qAgain").onclick = () => { qz = newQuiz(qz.cat); render(); }; $("#qBack").onclick = () => go("academy"); $("#qOther").onclick = () => { qz = null; render(); }; return;
  }
  v.innerHTML = `<div class="wrap" style="max-width:680px"><div class="vhead"><span class="note">${tx("Question", "Frage")} ${qz.i + 1}/${qz.qs.length} · ${qz.c} ${tx("correct", "richtig")}${" · " + esc(quizLabel(qz.cat))}</span><div class="bar2"><i style="width:${qz.i / qz.qs.length * 100}%"></i></div></div>
    <div class="card quizc">${q.img ? `<img src="${q.img}" alt="">` : ""}<h2>${esc(q.q)}</h2>
      <div class="qopts" id="qo">${q.opts.map(o => `<button data-o="${esc(o)}" class="${qz.ans ? (o === q.a ? "right" : o === qz.ans ? "wrong" : "") : ""}" ${qz.ans ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      ${qz.ans ? `<div class="why ${qz.ans === q.a ? "ok" : ""}"><b>${qz.ans === q.a ? tx("Right.", "Richtig.") : tx("Not quite.", "Nicht ganz.")}</b> ${esc(q.why || "")}${(() => { const sk = CATS.find(c => catName(c) === q.a); const st = sk && STYLE_TXT[sk] && STYLE_TXT[sk][lang === "de" ? "de" : "en"]; return st ? ` <span class="note" style="display:block;margin-top:6px;font-size:14px">${esc(catName(sk))}: ${esc(st[0])}</span>` : ""; })()}${q.h && byH[q.h] ? `<div class="whymore"><span class="note">${tx("Quick facts", "Kurz-Steckbrief")} · <b>${esc(byH[q.h].t)}</b></span><dl>${facts(byH[q.h]).map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join("")}</dl></div>` : ""}</div><div class="chips"><button class="btn primary" id="qNext">${qz.i + 1 < qz.qs.length ? tx("Next question", "Nächste Frage") : tx("See result", "Ergebnis")}</button></div>` : ""}</div></div>`;
  $("#qo").onclick = e => { const b = e.target.closest("[data-o]"); if (!b || qz.ans) return; qz.ans = b.dataset.o; if (qz.ans === q.a) qz.c++; render(); };
  $("#qNext") && ($("#qNext").onclick = () => { qz.i++; qz.ans = null; render(); });
}

/* ---- flashcards ---- */
let fc = { deck: null, i: 0, flip: false, filter: "all", kind: "k:bike" };
function facts(p) {
  if (p.k === "frameset") { const o = [[tx("Style", "Fahrstil"), frameStyle(p)], [tx("Material", "Material"), material(p)]]; const g = frameG(p); if (g) o.push([tx("Frame weight (M)", "Rahmengewicht (M)"), g + " g"]); const bb = bbOf(p); if (bb) o.push([tx("Bottom bracket", "Tretlager"), bb]); const ta = specVal(p, /through axles|steckachsen/i); if (ta) o.push([tx("Thru axles", "Steckachsen"), ta]); return o; }
  if (p.k === "part") { const code = (p.t.match(/BT-\s?[A-Z]{1,3}-?\s?[A-Z]?-?\d+/) || [""])[0].replace(/\s/g, ""); const T = CODE_TYPES(); const o = [[tx("Type", "Art"), T[codeOf(p.t)] || p.cat || "–"]]; if (code) o.push([tx("Code", "Nummer"), code]); const f = code ? fitsBikes(code) : []; if (f.length) o.push([tx("Fits", "Passt an"), f.slice(0, 6).join(", ") + (f.length > 6 ? " …" : "")]); return o; }
  if (p.k === "apparel" || p.k === "accessory") { const d0 = (L(p).d || "").split(/(?<=\.)\s/)[0]; return [[tx("Type", "Art"), p.cat || "–"], [tx("In short", "Kurz"), d0]]; }
  const d = TD[p.h], t2 = stockTire(p), out = [];
  out.push([tx("Style", "Fahrstil"), catName(p.cat)]); out.push([tx("Frame", "Rahmen"), material(p)]);
  if (d && d.rings.length && d.cogs) out.push([tx("Drivetrain", "Antrieb"), d.cogs[0] === d.cogs[1] ? `Singlespeed ${d.rings[0]}/${d.cogs[0]}T` : `${d.rings.length}×${d.speeds || ""} · ${d.rings.join("/")}T, ${d.cogs[0]}–${d.cogs[1]}T`]);
  if (t2) out.push([tx("Tyres (M)", "Reifen (M)"), `${t2[0]}-${t2[1]}`]);
  const w = kg(p); if (w) out.push([tx("Weight", "Gewicht"), w + " kg"]);
  const ex = [specVal(p, RX.rack) && tx("rack", "Gepäckträger"), specVal(p, RX.light) && tx("lights", "Licht")].filter(Boolean); if (ex.length) out.push(["Extras", ex.join(", ")]);
  return out;
}
function viewCards(v) {
  v.style.padding = "";
  if (needProfile(v)) return;
  const base = fc.kind === "k:frameset" ? FRAMES : fc.kind === "k:part" ? PARTS.filter(p => p.img) : fc.kind === "k:gear" ? GEAR : BIKES;
  const pool = base.filter(p => fc.filter === "all" || (fc.filter === "new" ? !LEARN.known.includes(p.h) : stylesOf(p).includes(fc.filter)));
  const dk = fc.kind + "|" + fc.filter;
  if (!fc.deck || fc.deckKey !== dk) { fc.deck = shuffle(pool.map(p => p.h)); fc.deckKey = dk; fc.i = 0; fc.flip = false; }
  const p = byH[fc.deck[fc.i]];
  v.innerHTML = `<div class="wrap" style="max-width:620px"><div class="vhead"><div class="ttl"><span class="mic">${AIC.cards}</span><h1>${tx("Flashcards", "Karteikarten")}</h1></div><p>${tx("Look at the photo, say what you know, flip to check.", "Foto ansehen, sagen was du weißt, umdrehen und prüfen.")} ${LEARN.known.length}/${BIKES.length} ${tx("known", "gekonnt")}</p></div>
    <div class="tsetup"><div class="row"><span class="lbl">${tx("Category", "Kategorie")}</span>${catBar(fc.kind, "fck")}</div>
    <div class="row"><span class="lbl">${tx("Deck", "Stapel")}</span><div class="chips" id="fcf">${[["all", tx("All", "Alle")], ["new", tx("Not known yet", "Noch nicht gekonnt")], ...(fc.kind === "k:bike" ? CATS.map(c => [c, catName(c)]) : [])].map(([k, l]) => `<button class="chip" data-f="${esc(k)}" aria-pressed="${fc.filter === k}">${esc(l)}</button>`).join("")}</div></div></div>
    ${p ? `<div class="tplay"><span class="mic">${AIC.cards}</span>${tx("Card", "Karte")} ${fc.i + 1} / ${fc.deck.length}</div><button class="card flash ${fc.flip ? "back" : ""}" id="fcCard">${fc.flip ? `<b class="fct">${esc(p.t)}</b><dl>${facts(p).map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join("")}</dl>` : `${p.img ? `<img src="${p.img}" alt="">` : cardArt(p)}<span class="note">${tx("Tap to flip", "Antippen zum Umdrehen")}</span>`}</button>
    <div class="chips" style="justify-content:flex-end"><span class="chips"><button class="btn" id="fcAgain">${tx("Again", "Nochmal")}</button><button class="btn primary" id="fcKnow">${tx("I know it", "Kann ich")} ✓</button></span></div>` : `<div class="card empty">${tx("All known in this deck.", "Alle Karten in diesem Stapel gekonnt.")}</div>`}</div>`;
  $("#fcf").onclick = e => { const b = e.target.closest("[data-f]"); if (b) { fc.filter = b.dataset.f; fc.deck = null; render(); } };
  $("#fck").onclick = e => { const b = e.target.closest("[data-kc]"); if (b) { fc.kind = b.dataset.kc; fc.filter = "all"; fc.deck = null; render(); } };
  if (!p) return;
  $("#fcCard").onclick = () => { fc.flip = !fc.flip; render(); };
  const next = () => { fc.flip = false; fc.i = (fc.i + 1) % fc.deck.length; render(); };
  $("#fcAgain").onclick = next;
  $("#fcKnow").onclick = () => { if (!LEARN.known.includes(p.h)) { LEARN.known.push(p.h); addXP(3); } next(); };
}

/* ---- objections & pitch (AI) ---- */
const OBJ = [
  ["price", "That's a lot of money for a steel bike.", "Das ist viel Geld für ein Stahlrad."],
  ["rust", "Doesn't steel rust?", "Rostet Stahl nicht?"],
  ["carbon", "Why not just buy carbon?", "Warum nicht gleich Carbon?"],
  ["weight", "It feels heavy compared to my road bike.", "Es fühlt sich schwer an im Vergleich zu meinem Rennrad."],
  ["gravel", "Do I really need a gravel bike? My road bike is fine.", "Brauche ich wirklich ein Gravel-Bike? Mein Rennrad reicht doch."],
  ["tires", "Can I fit wider tyres later?", "Kann ich später breitere Reifen fahren?"],
  ["brand", "I've never heard of Bombtrack.", "Von Bombtrack habe ich noch nie gehört."],
  ["online", "I can get it cheaper online.", "Online bekomme ich es günstiger."]
];
let ob = { mode: "conv", obj: OBJ[0][0], bike: "bombtrack-arise", text: "", res: null, busy: false };
function aiScore(kind, extra) {
  const p = byH[ob.bike]; const o = OBJ.find(x => x[0] === ob.obj);
  const task = kind === "obj"
    ? `The customer objects: "${o[1]}" (about the ${p.t}). The staff member answered:\n"""${ob.text}"""`
    : `The staff member gave this 30-second pitch for the ${p.t}:\n"""${ob.text}"""`;
  return `You are a senior Bombtrack sales trainer. ${task}

Evaluate it. Judge factual accuracy ONLY against the Bombtrack data below; list every claim that is wrong or not supported. Also judge clarity, customer focus and confidence. Be fair and encouraging. Write in ${lang === "de" ? "German, with Bombtrack's German terms" : "English"}, no em-dashes.

Bombtrack data:
${prodText(p, lang)}

Reply with only JSON: {"score": integer 1-10, "summary": one sentence, "good": [1-3 short points], "fix": [0-3 short points incl. wrong claims with the correct value], "better": one improved answer in at most 3 sentences}`;
}

/* objection stories: a customer, a bike, a doubt (shown like the advice cases) */
const OBJSCEN = [
  { id: "o-price", h: "bombtrack-arise", cat: "k:bike", lvl: 2,
    en: ["Steel singlespeed, really?", "Student, rides to uni every day and into the forest at weekends. Likes the Arise, but saw an aluminium bike with gears at a discounter for half the price.", "Why should I pay that much for a singlespeed made of steel?"],
    de: ["Stahl-Singlespeed, echt jetzt?", "Student, fährt täglich zur Uni und am Wochenende in den Wald. Mag das Arise, hat aber beim Discounter ein Alu-Rad mit Schaltung für die Hälfte gesehen.", "Warum soll ich so viel für ein Singlespeed aus Stahl zahlen?"] },
  { id: "o-rust", h: "bombtrack-arise-tour", cat: "k:bike", lvl: 1,
    en: ["Winter commute by the sea", "Commutes 15 km along the coast all year, salt on the roads in winter. Wants the Arise Tour for the dynamo and racks, but a colleague told him steel always rusts.", "Steel will be rusty after one winter, won't it?"],
    de: ["Pendeln an der Küste", "Pendelt das ganze Jahr 15 km an der Küste, im Winter wird gestreut. Will das Arise Tour wegen Dynamo und Gepäckträger, aber ein Kollege meint, Stahl rostet immer.", "Nach einem Winter ist der Stahl doch durchgerostet, oder?"] },
  { id: "o-carbon", h: "bombtrack-audax", cat: "k:bike", lvl: 2,
    en: ["Why not carbon?", "Experienced road rider, wants to go longer on gravel. Test-rode the Audax and liked it, but his club mates all ride carbon.", "For this money I'd rather get a carbon bike. Why steel?"],
    de: ["Warum nicht Carbon?", "Erfahrene Rennradfahrerin, will längere Gravel-Touren fahren. Hat das Audax probegefahren und mochte es, aber im Verein fahren alle Carbon.", "Für das Geld nehme ich lieber Carbon. Warum Stahl?"] },
  { id: "o-weight", h: "bombtrack-beyond-plus-29", cat: "k:bike", lvl: 1,
    en: ["Too heavy?", "Plans a two-week bikepacking trip through Scandinavia. Lifted the Beyond+ 29 in the shop and put it straight back.", "That thing is heavy. My road bike is half the weight."],
    de: ["Zu schwer?", "Plant zwei Wochen Bikepacking durch Skandinavien. Hat das Beyond+ 29 im Laden angehoben und sofort wieder abgestellt.", "Das Ding ist schwer. Mein Rennrad wiegt die Hälfte."] },
  { id: "o-ext", h: "bombtrack-hook-ext-rival", cat: "k:bike", lvl: 2,
    en: ["Hook or Hook EXT?", "Has decided on a Bombtrack Hook for gravel and bikepacking. Now stands between the Hook and the Hook EXT Rival and doesn't see the difference.", "The normal Hook looks almost the same. Why should I pay more for the EXT?"],
    de: ["Hook oder Hook EXT?", "Hat sich für ein Bombtrack Hook für Gravel und Bikepacking entschieden. Steht jetzt zwischen Hook und Hook EXT Rival und sieht den Unterschied nicht.", "Das normale Hook sieht fast gleich aus. Warum soll ich für das EXT mehr zahlen?"] },
  { id: "o-tyres", h: "bombtrack-tension-rival", cat: "k:bike", lvl: 3,
    en: ["Wider tyres later?", "Races cyclocross in winter and wants one bike for summer gravel rides too. Likes the Tension Rival.", "I'll just put 45 mm tyres on it in summer, that works, right?"],
    de: ["Später breitere Reifen?", "Fährt im Winter Cyclocross-Rennen und will ein Rad, das im Sommer auch für Gravel taugt. Mag das Tension Rival.", "Im Sommer ziehe ich einfach 45er Reifen auf, das geht doch, oder?"] },
  { id: "o-parts", h: "bombtrack-beyond-1", cat: "k:bike", lvl: 1,
    en: ["Parts in five years?", "Wants the Beyond 1 for a long tour along the Danube and plans to keep it for many years. Bombtrack is a smaller brand than the ones she knows.", "Will I still get spare parts for it in five years?"],
    de: ["Ersatzteile in fünf Jahren?", "Will das Beyond 1 für eine lange Tour an der Donau und es viele Jahre fahren. Bombtrack ist kleiner als die Marken, die sie kennt.", "Bekomme ich in fünf Jahren noch Ersatzteile dafür?"] },
  { id: "o-online", h: "bombtrack-hook-ext-c-apex-axs", cat: "k:bike", lvl: 3,
    en: ["Cheaper online", "Has researched for weeks, knows every spec of the Hook EXT C Apex AXS and comes in with a screenshot from an online shop.", "Online it's cheaper. Why should I buy it from you?"],
    de: ["Online günstiger", "Hat wochenlang recherchiert, kennt jede Spec vom Hook EXT C Apex AXS und kommt mit einem Screenshot aus einem Onlineshop.", "Online ist es günstiger. Warum soll ich bei euch kaufen?"] },
  { id: "o-cargo", h: "bombtrack-munroe-cargo", cat: "k:bike", lvl: 3,
    en: ["No motor?", "Lives on a hill, wants to do the weekly shopping by bike. Likes the Munroe Cargo, but all her friends ride e-cargo bikes.", "Without a motor I'll never get up the hill with the shopping."],
    de: ["Ohne Motor?", "Wohnt am Berg, will den Wocheneinkauf mit dem Rad machen. Mag das Munroe Cargo, aber alle Freundinnen fahren E-Lastenräder.", "Ohne Motor komme ich mit den Einkäufen nie den Berg hoch."] },
  { id: "o-sus", h: "bombtrack-beyond-sus", cat: "k:bike", lvl: 2,
    en: ["40 mm is pointless", "Rides mountain bike trails and gravel. Saw the Beyond SUS with a short-travel fork and laughs about it.", "40 mm of suspension? Either a real mountain bike or no fork at all."],
    de: ["40 mm bringen nichts", "Fährt MTB-Trails und Gravel. Sieht das Beyond SUS mit kurzhubiger Federgabel und lacht darüber.", "40 mm Federweg? Entweder ein richtiges MTB oder gar keine Federung."] },
  { id: "o-ti", h: "bombtrack-hook-ext-ti", cat: "k:bike", lvl: 3,
    en: ["Titanium hype", "Wants a bike for the next ten years and is torn between the Hook EXT TI and a steel Hook EXT.", "Titanium is just overpriced hype, isn't it?"],
    de: ["Titan-Hype", "Will ein Rad für die nächsten zehn Jahre und schwankt zwischen dem Hook EXT TI und einem Hook EXT aus Stahl.", "Titan ist doch nur überteuerter Hype, oder?"] },
  { id: "o-frameset", h: "bombtrack-hook-ext-frameset", cat: "k:frameset", lvl: 2,
    en: ["Building up costs more", "Hobby mechanic with a box full of parts. Wants to build up a Hook EXT Frameset himself.", "A frameset plus parts costs more than a complete bike. Why bother?"],
    de: ["Aufbauen ist teurer", "Hobbyschrauber mit einer Kiste voller Teile. Will ein Hook EXT Frameset selbst aufbauen.", "Frameset plus Teile kostet mehr als ein Komplettrad. Warum sollte ich das machen?"] },
  { id: "o-hanger", h: "bombtrack-bt-dh-008-derailleur-hanger", cat: "k:part", lvl: 1,
    en: ["Bent again", "Comes in with a Hook after a fall, the derailleur hanger is bent for the second time this year.", "Why does this part break so easily? Sounds like bad quality."],
    de: ["Schon wieder verbogen", "Kommt nach einem Sturz mit seinem Hook, das Schaltauge ist dieses Jahr zum zweiten Mal verbogen.", "Warum geht das Teil so leicht kaputt? Klingt nach schlechter Qualität."] }
];
let prTone = "normal";
const LVLS = { 1: ["relaxed", "Easy", "Einfach"], 2: ["normal", "Medium", "Mittel"], 3: ["demanding", "Hard", "Schwer"] };
const lvlPill = l => { const x = LVLS[l] || LVLS[2], T = TONES[x[0]]; return `<span class="lvl l${l}"><i></i><i></i><i></i>${esc(lang === "de" ? x[2] : x[1])} · ${esc(T[lang === "de" ? "de" : "en"])}</span>`; };
const TONES = {
  relaxed: { en: "Relaxed", de: "Entspannt", p: "Friendly, open and easy-going. You trust the staff and are happy to hear suggestions." },
  normal: { en: "Neutral", de: "Neutral", p: "Polite but undecided. You ask follow-up questions and compare options." },
  demanding: { en: "Demanding", de: "Fordernd", p: "Impatient, sceptical and a bit pushy. You question claims, mention cheaper offers online or other brands, interrupt with follow-ups and want precise answers fast. Stay realistic and never rude." }
};
const toneBar = () => `<div class="chips" id="prTone">${Object.entries(TONES).map(([k, x]) => `<button class="chip" data-tone="${k}" aria-pressed="${prTone === k}">${esc(x[lang === "de" ? "de" : "en"])}</button>`).join("")}</div>`;
function bindTone() { const el = $("#prTone"); if (el) el.onclick = e => { const b = e.target.closest("[data-tone]"); if (b) { prTone = b.dataset.tone; render(); } }; }
function startObjTalk(id) {
  const o = OBJSCEN.find(x => x.id === id); const p = byH[o.h];
  const L2 = lang === "de" ? o.de : o.en;
  pr = { sc: { id: o.id, kind: "obj", lvl: o.lvl || 2, objText: L2[2], en: [o.en[0], `${o.en[1]} The customer's doubt about the ${p ? p.t : ""}: "${o.en[2]}"`], de: [o.de[0], `${o.de[1]} Einwand: „${o.de[2]}“`] }, turns: [], fb: null, busy: false };
  render(); customerTurn();
}
function renderTrainTabs() { return `<div class="chips" id="trTabs">${[["conv", tx("General advice", "Allgemeine Beratung")], ["obj", tx("Objections", "Einwände")], ["pitch", tx("30-second pitch", "30-Sekunden-Pitch")]].map(([k, l]) => `<button class="chip" data-m="${k}" aria-pressed="${ob.mode === k}">${esc(l)}</button>`).join("")}</div>`; }
function bindTrainTabs() { $("#trTabs").onclick = e => { const b = e.target.closest("[data-m]"); if (b) { ob.mode = b.dataset.m; ob.res = null; ob.text = ""; render(); } }; }
function viewObjPitch(v) {
  if (ob.mode === "obj") {
    v.innerHTML = `<div class="wrap"><div class="vhead"><h1>${esc(t("prTitle"))}</h1><p>${tx("A customer likes a product but has a doubt. Talk it through in the chat, then finish and get feedback on how well you handled it.", "Kundschaft mag ein Produkt, hat aber einen Einwand. Kläre das im Chat, beende das Gespräch und bekomm Feedback, wie gut du reagiert hast.")}</p></div>${renderTrainTabs()}
      <div class="tsetup"><div class="row"><span class="lbl">${tx("Category", "Kategorie")}</span>${catBar(prCat, "prk")}</div></div>
      <h3 class="setgrp">${tx("Pick a case: easy first, then harder", "Fall wählen: erst einfach, dann schwerer")}</h3>
      <div class="scen" id="objs">${OBJSCEN.filter(o => o.cat === prCat).sort((a, b) => (a.lvl || 2) - (b.lvl || 2)).map(o => { const L2 = lang === "de" ? o.de : o.en; return `<button data-o="${o.id}">${lvlPill(o.lvl || 2)}<b>${esc(L2[0])}</b><span>${esc(L2[1])}</span><span class="objq">„${esc(L2[2])}“</span></button>`; }).join("") || `<div class="card empty">–</div>`}</div>
      ${!sample ? `<div class="card empty">${esc(t("noChat"))}</div>` : ""}</div>`;
    bindTrainTabs();
    $("#prk").onclick = e => { const b = e.target.closest("[data-kc]"); if (b) { prCat = b.dataset.kc; render(); } };
    $("#objs").onclick = e => { const b = e.target.closest("[data-o]"); if (b && sample) startObjTalk(b.dataset.o); };
    return;
  }
  const isObj = ob.mode === "obj", o = OBJ.find(x => x[0] === ob.obj), p = byH[ob.bike];
  const r = ob.res;
  v.innerHTML = `<div class="wrap" style="max-width:820px"><div class="vhead"><h1>${esc(t("prTitle"))}</h1><p>${isObj ? tx("Answer a typical objection. Claude checks your answer against the real specs.", "Beantworte einen typischen Einwand. Claude prüft deine Antwort gegen die echten Specs.") : tx("Pitch a bike in your own words, as if you had 30 seconds at the counter.", "Stell ein Bike in eigenen Worten vor, als hättest du 30 Sekunden an der Theke.")}</p></div>${renderTrainTabs()}
    <div class="card form" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      ${isObj ? `<label class="full">${tx("Objection", "Einwand")}<select id="ob_o">${OBJ.map(x => `<option value="${x[0]}" ${x[0] === ob.obj ? "selected" : ""}>${esc(lang === "de" ? x[2] : x[1])}</option>`).join("")}</select></label>` : ""}
      <label class="full">${t("bike")}<select id="ob_b">${BIKES.map(b => `<option value="${esc(b.h)}" ${b.h === ob.bike ? "selected" : ""}>${esc(b.t)}</option>`).join("")}</select></label></div>
    ${isObj ? `<div class="bubble cust">"${esc(lang === "de" ? o[2] : o[1])}"</div>` : ""}
    <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;gap:8px"><textarea id="ob_t" rows="4" class="field" style="border:0;padding:0;resize:vertical" placeholder="${isObj ? tx("Your answer to the customer…", "Deine Antwort an die Kundschaft…") : tx("Your pitch…", "Dein Pitch…")}">${esc(ob.text)}</textarea>
      <div class="chips" style="justify-content:flex-end"><button class="btn primary" id="ob_go" ${ob.busy || !sample ? "disabled" : ""}>${ob.busy ? esc(t("thinking")) : tx("Get feedback", "Feedback holen")}</button></div></div>
    ${!sample ? `<div class="card empty">${esc(t("noChat"))}</div>` : ""}
    ${r ? `<div class="card" style="padding:18px;display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><div class="note">${esc(t("score"))}</div><div class="score">${esc(r.score ?? "–")}<span class="muted" style="font-size:22px">/10</span></div></div><p style="margin:0;flex:1;min-width:220px">${esc(r.summary || "")}</p></div>
      <div class="fb"><div class="card"><h3>${esc(t("good"))}</h3><ul>${(r.good || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div><div class="card"><h3>${esc(t("missed"))}</h3><ul>${(r.fix || []).map(x => `<li>${esc(x)}</li>`).join("") || `<li>–</li>`}</ul></div></div>
      <div class="card" style="padding:14px 16px"><h3 style="font-size:15px;margin-bottom:6px">${esc(t("better"))}</h3><p style="margin:0">${esc(r.better || "")}</p></div>` : ""}</div>`;
  bindTrainTabs();
  $("#ob_o") && ($("#ob_o").onchange = e => { ob.obj = e.target.value; ob.res = null; render(); });
  $("#ob_b").onchange = e => { ob.bike = e.target.value; ob.res = null; render(); };
  $("#ob_t").oninput = e => { ob.text = e.target.value; };
  $("#ob_go").onclick = async () => {
    ob.text = $("#ob_t").value.trim(); if (!ob.text || ob.busy || !sample) return; ob.busy = true; render();
    try { ob.res = await ai(isObj ? "objection" : "pitch", aiScore(isObj ? "obj" : "pitch"), { cache: false }, true); const s = +ob.res.score || 0; const slot = isObj ? LEARN.obj : LEARN.pitch; slot.n++; slot.best = Math.max(slot.best, s); addXP(10 + s); }
    catch (e) { ob.res = { score: "–", summary: ERR[e.code] || tx("Feedback couldn't be created. Try again.", "Feedback konnte nicht erstellt werden. Bitte nochmal versuchen.") }; }
    ob.busy = false; if (route.v === "practice") render();
  };
}
