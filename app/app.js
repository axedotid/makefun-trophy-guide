// Vice Got a Price! — GTA VI trophy guide & tracker.
// Plain ES module: loads trophies.json, renders the checklist with filters, spoiler mode,
// a roadmap sidebar, and localStorage progress with export/import. No network.

const STORE_KEY = 'gta6-trophy-tracker-v1';
const rows = document.getElementById('rows');
const progressEl = document.getElementById('progress');
const kindSel = document.getElementById('kind');
const gradeSel = document.getElementById('grade');
const hideEarned = document.getElementById('hide-earned');
const spoilerToggle = document.getElementById('spoiler');
const gradeSummary = document.getElementById('grade-summary');

const SOURCE_NAMES = {
  PP: 'PowerPyx', PST: 'PlayStationTrophies.org', PSQ: 'Push Square', K6: 'Know GTA 6',
  GD: 'GamesRadar+', GL: 'GTA Wiki', EX: 'Exophase', NP: 'PSNProfiles',
};
const SOURCE_URLS = {
  PP: 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/',
  PST: 'https://www.playstationtrophies.org/game/grand-theft-auto-6/guide/',
  PSQ: 'https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap',
  K6: 'https://knowgta6.com/jason-gta-6-trophies-platinum/',
  GD: 'https://www.gamesradar.com/games/grand-theft-auto/gta-6-trophy-achievement-list/',
  GL: 'https://gta.wiki/w/Achievements_and_Trophies_in_GTA_VI',
  EX: 'https://www.exophase.com/game/grand-theft-auto-vi-ps5/trophies/',
  NP: 'https://psnprofiles.com/trophies/',
};

const doc = await (await fetch('data/trophies.json')).json();
const all = doc.trophies;

let earned = loadProgress();
let spoiler = localStorage.getItem(STORE_KEY + ':spoiler') === '1';

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return new Set(Array.isArray(raw.earned) ? raw.earned : []);
  } catch { return new Set(); }
}
function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned], spoiler }));
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function sourcesLine(t) {
  const wrap = el('div', 'sources');
  wrap.append(el('b', null, 'Sources: '));
  const keys = t.sources && t.sources.length ? t.sources : Object.keys(SOURCE_NAMES);
  keys.forEach((k, i) => {
    const name = SOURCE_NAMES[k] || k;
    if (SOURCE_URLS[k]) {
      const a = el('a', null, name);
      a.href = SOURCE_URLS[k];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      wrap.append(a);
    } else {
      wrap.append(document.createTextNode(name));
    }
    if (i < keys.length - 1) wrap.append(document.createTextNode('; '));
  });
  return wrap;
}

function filtered() {
  const k = kindSel.value;
  const g = gradeSel.value;
  return all.filter((t) => {
    if (k === 'missable' && !t.missable) return false;
    if (k !== 'all' && k !== 'missable' && t.kind !== k) return false;
    if (g !== 'all' && t.grade !== g) return false;
    if (hideEarned.checked && earned.has(t.name)) return false;
    return true;
  });
}

function render() {
  rows.replaceChildren();
  for (const t of filtered()) {
    const earnedThis = earned.has(t.name);
    const card = el('div', 'trophy' + (earnedThis ? ' earned' : '') + (t.missable ? ' missable' : ''));

    const tick = el('div', 'tick');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = earnedThis;
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveProgress();
      render();
    });
    tick.append(box);

    const body = el('div', 'body');
    const top = el('div', 'top');

    // Spoiler: hide story trophy names/descriptions until earned.
    const isStoryHidden = spoiler && t.kind === 'story' && !earnedThis;
    top.append(el('span', 'name', isStoryHidden ? 'Hidden story trophy' : t.name));

    const badge = el('span', 'badge ' + t.grade, t.grade);
    top.append(badge);
    if (t.missable) top.append(el('span', 'flag', 'Missable'));
    body.append(top);

    if (isStoryHidden) {
      body.append(el('div', 'desc', 'Story trophy — name and description hidden until earned.'));
      body.append(el('div', 'hidden-note', 'Spoiler mode is on. Earn it, or untick spoiler mode in the toolbar.'));
    } else {
      if (t.description) body.append(el('div', 'desc', t.description));
      const bits = [];
      if (t.count) bits.push(t.count);
      if (t.chapter) bits.push(t.chapter);
      if (bits.length) body.append(el('div', 'meta', bits.join(' · ')));
      body.append(el('div', 'guide', t.guide));
      body.append(sourcesLine(t));
    }

    card.append(tick, body);
    rows.append(card);
  }
  renderSummary();
}

function renderSummary() {
  const total = all.length;
  const got = earned.size;
  progressEl.textContent = got + ' of ' + total + ' earned';
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const gotCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of all) {
    counts[t.grade] = (counts[t.grade] ?? 0) + 1;
    if (earned.has(t.name)) gotCounts[t.grade] = (gotCounts[t.grade] ?? 0) + 1;
  }
  gradeSummary.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const li = el('li');
    li.append(el('span', 'badge ' + g, g));
    li.append(el('span', 'muted', gotCounts[g] + ' / ' + counts[g]));
    gradeSummary.append(li);
  }
}

document.getElementById('export').addEventListener('click', () => {
  const data = { game: 'GTA VI', earned: [...earned], spoiler, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(list)) throw new Error('no earned list');
    earned = new Set(list);
    if (typeof data.spoiler === 'boolean') spoiler = data.spoiler;
    saveProgress();
    render();
  } catch (err) {
    alert('Could not import progress: ' + err.message);
  }
});

kindSel.addEventListener('change', render);
gradeSel.addEventListener('change', render);
hideEarned.addEventListener('change', render);
spoilerToggle.addEventListener('change', () => {
  spoiler = spoilerToggle.checked;
  localStorage.setItem(STORE_KEY + ':spoiler', spoiler ? '1' : '0');
  render();
});

spoilerToggle.checked = spoiler;
render();