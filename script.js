const APP_YEAR = 2026;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const scheduleCache = new Map();
const fallbackPosterCache = new Map();

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createRandom(seedText) {
  let seed = hashString(seedText) || 1;
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function seededShuffle(input, seedText) {
  const list = [...input];
  const random = createRandom(seedText);

  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dayOfYear(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86400000);
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getBrowserToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getInitialDate() {
  const today = getBrowserToday();
  if (today.getFullYear() === APP_YEAR) {
    return today;
  }
  return new Date(APP_YEAR, 4, 30);
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitTitleLines(title) {
  const chars = Array.from(title);
  const lines = [];
  const lineLength = title.length <= 6 ? 6 : title.length <= 10 ? 5 : 4;

  for (let index = 0; index < chars.length; index += lineLength) {
    lines.push(chars.slice(index, index + lineLength).join(''));
  }

  return lines.slice(0, 3);
}

function buildFallbackPosterDataUri(film, date) {
  const cacheKey = `${film.title}-${formatDate(date)}`;
  if (fallbackPosterCache.has(cacheKey)) {
    return fallbackPosterCache.get(cacheKey);
  }

  const hue = hashString(cacheKey) % 360;
  const titleLines = splitTitleLines(film.title);
  const titleSvg = titleLines
    .map((line, index) => `<text x="72" y="${430 + index * 88}" font-size="72" font-weight="800" fill="#f6f1ea" letter-spacing="2">${escapeSvgText(line)}</text>`)
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1000" role="img" aria-label="${escapeSvgText(film.title)} 海报">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue} 42% 26%)" />
          <stop offset="100%" stop-color="#090b11" />
        </linearGradient>
      </defs>
      <rect width="720" height="1000" fill="url(#bg)" />
      <rect x="32" y="32" width="656" height="936" rx="34" fill="none" stroke="rgba(255,255,255,.14)" />
      <text x="72" y="110" font-size="22" fill="#d6a363" letter-spacing="6">${escapeSvgText(formatDate(date))}</text>
      ${titleSvg}
      <text x="72" y="780" font-size="24" fill="#f6f1ea" opacity="0.72">${escapeSvgText(film.director || '')}</text>
      <text x="72" y="820" font-size="22" fill="#f6f1ea" opacity="0.6">${escapeSvgText(`豆瓣 ${film.rating || ''}`)}</text>
    </svg>
  `;

  const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  fallbackPosterCache.set(cacheKey, dataUri);
  return dataUri;
}

function resolvePoster(film, date) {
  return film.poster || buildFallbackPosterDataUri(film, date);
}

function applyPoster(imageNode, film, date) {
  if (!imageNode || !film) {
    return;
  }

  const fallback = buildFallbackPosterDataUri(film, date);
  imageNode.alt = `${film.title} 海报`;
  imageNode.loading = 'eager';
  imageNode.decoding = 'async';
  imageNode.onerror = () => {
    imageNode.onerror = null;
    imageNode.src = fallback;
  };
  imageNode.src = resolvePoster(film, date);
}

function buildYearSchedule(year) {
  if (scheduleCache.has(year)) {
    return scheduleCache.get(year);
  }

  const library = window.FILM_LIBRARY || [];
  const schedule = seededShuffle(library, `${year}-douban-calendar`).slice(0, 365);
  scheduleCache.set(year, schedule);
  return schedule;
}

function getFilmForDate(date) {
  const schedule = buildYearSchedule(date.getFullYear());
  return schedule[dayOfYear(date) - 1];
}

function getMonthProgress(date) {
  const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth());
  return {
    day: date.getDate(),
    daysInMonth,
    ratio: (date.getDate() / daysInMonth) * 100
  };
}

const MONTH_VIEWING_MOODS = [
  '新年的开场',
  '冬天还没退场的时候',
  '春天刚起风的夜里',
  '四月有一点雨意的时候',
  '把日常放慢一点的时候',
  '入夏之前的夜里',
  '长日照结束后的傍晚',
  '盛夏闷热的晚上',
  '换季的时候',
  '秋天的晚风里',
  '深秋夜里',
  '年末收尾的时候'
];

const GENRE_TONES = {
  剧情: '人的情绪和处境拍得更深也更稳',
  爱情: '爱与犹疑拍得很有余温',
  动画: '想象力和温柔同时安放进画面里',
  奇幻: '现实和想象接得很自然',
  犯罪: '选择与代价推得更近',
  喜剧: '轻和重的分寸拿得很准',
  冒险: '远行的心气重新点亮',
  科幻: '想象力最后还是落回人的命运',
  悬疑: '每个细节都在替情绪加压',
  家庭: '那些说不出口的话慢慢落到心里',
  音乐: '节奏和情绪一起起伏',
  战争: '人性的重量压得很真',
  历史: '时代回声拉得很长',
  动作: '节奏利落，情绪也很直接',
  传记: '真实人生拍得更有力量',
  同性: '亲密和自我认同都拍得真诚',
  西部: '辽阔和克制同时留在画面里',
  惊悚: '紧张感会慢慢渗进空气里',
  纪录片: '真实本身就足够有力量',
  灾难: '把危机和人心同时推到眼前'
};

const CALENDAR_COPY_ENDINGS = [
  '适合一个人慢慢看完。',
  '很适合在片尾之后再安静一会。',
  '会在今天留下很长的余味。',
  '适合把这一天轻轻放进去。'
];

function getPrimaryDirector(director) {
  return String(director || '')
    .split(/\s*[/、，,]/)[0]
    .trim();
}

function getPrimaryGenre(film) {
  return (film.genres && film.genres[0]) || '';
}

function buildCalendarCopy(film, date, compact = false) {
  const mood = MONTH_VIEWING_MOODS[date.getMonth()] || '这一天';
  const tone = GENRE_TONES[getPrimaryGenre(film)] || '情绪收得很稳';
  const directorName = getPrimaryDirector(film.director);
  const makerPart = directorName ? `${directorName}把${tone}` : `它把${tone}`;

  if (compact) {
    return `今天推荐《${film.title}》，${makerPart}，适合慢慢点开。`;
  }

  const ending = CALENDAR_COPY_ENDINGS[hashString(`${film.title}-${date.getMonth()}-${date.getDate()}`) % CALENDAR_COPY_ENDINGS.length];
  return `在${mood}看《${film.title}》正合适，${makerPart}，${ending}`;
}

const state = {
  today: getInitialDate(),
  selectedDate: getInitialDate(),
  viewMonth: getInitialDate().getMonth()
};

function renderWeekdays() {
  const row = document.getElementById('weekday-row');
  if (!row) {
    return;
  }

  row.innerHTML = '';
  WEEKDAYS.forEach((label) => {
    const item = document.createElement('span');
    item.textContent = label;
    row.appendChild(item);
  });
}

function renderCalendar() {
  const titleNode = document.getElementById('calendar-title');
  const grid = document.getElementById('month-grid');

  if (!titleNode || !grid) {
    return;
  }

  const currentMonthDate = new Date(APP_YEAR, state.viewMonth, 1);
  titleNode.textContent = `${APP_YEAR}年${state.viewMonth + 1}月`;
  grid.innerHTML = '';

  const monthStartWeekday = currentMonthDate.getDay();
  const firstVisibleDate = new Date(APP_YEAR, state.viewMonth, 1 - monthStartWeekday);

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(firstVisibleDate);
    cellDate.setDate(firstVisibleDate.getDate() + index);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell has-dot';

    const isCurrentMonth = cellDate.getMonth() === state.viewMonth;
    const isSelected = isSameDate(cellDate, state.selectedDate);
    const isToday = isSameDate(cellDate, state.today);

    if (!isCurrentMonth) {
      button.classList.add('is-outside');
    }
    if (isSelected) {
      button.classList.add('is-selected');
    }
    if (isToday) {
      button.classList.add('is-today');
    }

    button.setAttribute('aria-label', formatDate(cellDate));
    button.innerHTML = `<span class="day-cell-number">${cellDate.getDate()}</span>`;
    button.addEventListener('click', () => {
      state.viewMonth = cellDate.getMonth();
      state.selectedDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
      renderAll();
    });

    grid.appendChild(button);
  }
}

function createChip(text, className = 'detail-chip') {
  const chip = document.createElement('span');
  chip.className = className;
  chip.textContent = text;
  return chip;
}

function renderCalendarFooter() {
  const film = getFilmForDate(state.selectedDate);
  const featurePoster = document.getElementById('feature-poster');
  const featureDate = document.getElementById('feature-date');
  const featureTitle = document.getElementById('feature-title');
  const featureMeta = document.getElementById('feature-meta');
  const featureNote = document.getElementById('feature-note');
  const progressLabel = document.getElementById('month-progress-label');
  const progressValue = document.getElementById('month-progress-value');
  const progressFill = document.getElementById('month-progress-fill');
  const featureGenres = document.getElementById('feature-genres');

  if (!film || !featurePoster || !featureDate || !featureTitle || !featureMeta || !featureNote || !progressLabel || !progressValue || !progressFill || !featureGenres) {
    return;
  }

  const progress = getMonthProgress(state.selectedDate);
  applyPoster(featurePoster, film, state.selectedDate);
  featureDate.textContent = formatDate(state.selectedDate);
  featureTitle.textContent = film.title;
  featureMeta.innerHTML = '';

  if (film.director) {
    featureMeta.appendChild(createChip(`导演 · ${getPrimaryDirector(film.director)}`, 'calendar-chip'));
  }
  if (film.rating) {
    featureMeta.appendChild(createChip(`豆瓣 · ${film.rating}`, 'calendar-chip'));
  }
  if (film.year) {
    featureMeta.appendChild(createChip(`年份 · ${film.year}`, 'calendar-chip'));
  }

  featureNote.textContent = buildCalendarCopy(film, state.selectedDate, true);
  progressLabel.textContent = `${state.selectedDate.getMonth() + 1} 月进度`;
  progressValue.textContent = `${progress.day}/${progress.daysInMonth}`;
  progressFill.style.width = `${progress.ratio}%`;

  featureGenres.innerHTML = '';
  (film.genres || []).slice(0, 4).forEach((genre) => {
    featureGenres.appendChild(createChip(genre, 'calendar-chip'));
  });
}

function renderDetail() {
  const film = getFilmForDate(state.selectedDate);
  const dateNode = document.getElementById('detail-date');
  const image = document.getElementById('detail-poster');
  const title = document.getElementById('detail-title');
  const metaGrid = document.getElementById('detail-meta-grid');
  const quote = document.getElementById('detail-quote');

  if (!film || !dateNode || !image || !title || !metaGrid || !quote) {
    return;
  }

  dateNode.textContent = formatDate(state.selectedDate);
  applyPoster(image, film, state.selectedDate);
  title.textContent = film.title;
  metaGrid.innerHTML = '';

  if (film.director) {
    metaGrid.appendChild(createChip(`导演 · ${film.director}`));
  }
  if (film.rating) {
    metaGrid.appendChild(createChip(`豆瓣 · ${film.rating}`, 'detail-chip is-rating'));
  }
  if (film.year) {
    metaGrid.appendChild(createChip(`年份 · ${film.year}`));
  }
  if (film.country) {
    metaGrid.appendChild(createChip(`地区 · ${film.country}`));
  }
  (film.genres || []).slice(0, 4).forEach((genre) => {
    metaGrid.appendChild(createChip(`类型 · ${genre}`));
  });

  quote.textContent = buildCalendarCopy(film, state.selectedDate, false);
}

function renderAll() {
  renderCalendar();
  renderCalendarFooter();
  renderDetail();
}

function clampMonth(month) {
  if (month < 0) {
    return 11;
  }
  if (month > 11) {
    return 0;
  }
  return month;
}

function bindEvents() {
  const prevButton = document.getElementById('prev-month');
  const nextButton = document.getElementById('next-month');
  const todayButton = document.getElementById('jump-today');

  prevButton?.addEventListener('click', () => {
    state.viewMonth = clampMonth(state.viewMonth - 1);
    const daysInMonth = getDaysInMonth(APP_YEAR, state.viewMonth);
    const targetDay = Math.min(state.selectedDate.getDate(), daysInMonth);
    state.selectedDate = new Date(APP_YEAR, state.viewMonth, targetDay);
    renderAll();
  });

  nextButton?.addEventListener('click', () => {
    state.viewMonth = clampMonth(state.viewMonth + 1);
    const daysInMonth = getDaysInMonth(APP_YEAR, state.viewMonth);
    const targetDay = Math.min(state.selectedDate.getDate(), daysInMonth);
    state.selectedDate = new Date(APP_YEAR, state.viewMonth, targetDay);
    renderAll();
  });

  todayButton?.addEventListener('click', () => {
    state.viewMonth = state.today.getMonth();
    state.selectedDate = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
    renderAll();
  });
}

function createPianoPlaylist() {
  const tracks = [
    { name: 'Quiet Nocturne I', progression: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['G3', 'B3', 'D4']], barSeconds: 3.4, duration: 32 },
    { name: 'Window Light II', progression: [['C3', 'G3', 'C4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'D4', 'G4']], barSeconds: 3.1, duration: 28 },
    { name: 'Blue Hall III', progression: [['D3', 'A3', 'D4'], ['B3', 'D4', 'F4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4']], barSeconds: 3.7, duration: 30 }
  ];

  const frequencies = {
    C3: 130.81,
    D3: 146.83,
    E3: 164.81,
    F3: 174.61,
    G3: 196.0,
    A3: 220.0,
    B3: 246.94,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.0
  };

  const toggleButton = document.getElementById('audio-toggle');
  const statusLabel = document.getElementById('audio-status');
  const trackLabel = document.getElementById('audio-track');
  const volumeInput = document.getElementById('audio-volume');

  if (!toggleButton || !statusLabel || !trackLabel || !volumeInput) {
    return;
  }

  let audioContext = null;
  let masterGain = null;
  let currentTrackIndex = 0;
  let nextTimer = null;
  let isPlaying = false;
  let volume = Number(volumeInput.value) / 100;

  function ensureContext() {
    if (!audioContext) {
      audioContext = new window.AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContext.destination);
    }
  }

  function playNote(freq, time, duration, loudness) {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 2;
    osc2.detune.value = 4;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + duration);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(loudness, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc1.start(time);
    osc2.start(time + 0.01);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  function scheduleTrack(track, startTime) {
    const bars = Math.ceil(track.duration / track.barSeconds);
    for (let bar = 0; bar < bars; bar += 1) {
      const chord = track.progression[bar % track.progression.length];
      const barStart = startTime + bar * track.barSeconds;
      chord.forEach((note, idx) => {
        playNote(frequencies[note], barStart + idx * 0.09, track.barSeconds * 0.9, 0.12 - idx * 0.018);
      });
      const melodyPattern = [0, 2, 1, 2];
      melodyPattern.forEach((chordIndex, patternIndex) => {
        const melodyNote = chord[chordIndex];
        playNote(frequencies[melodyNote] * 2, barStart + 0.58 + patternIndex * (track.barSeconds / 4.6), 1.6, 0.05);
      });
    }
  }

  function scheduleCurrentTrack() {
    const track = tracks[currentTrackIndex];
    trackLabel.textContent = track.name;
    statusLabel.textContent = '正在播放';
    scheduleTrack(track, audioContext.currentTime + 0.06);

    nextTimer = window.setTimeout(() => {
      if (!isPlaying) {
        return;
      }
      currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
      scheduleCurrentTrack();
    }, track.duration * 1000);
  }

  function startPlayback() {
    ensureContext();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    if (masterGain) {
      masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.12);
    }
    isPlaying = true;
    toggleButton.textContent = '❚❚';
    if (nextTimer) {
      window.clearTimeout(nextTimer);
    }
    scheduleCurrentTrack();
  }

  function stopPlayback() {
    isPlaying = false;
    toggleButton.textContent = '♪';
    statusLabel.textContent = '已暂停';
    if (nextTimer) {
      window.clearTimeout(nextTimer);
      nextTimer = null;
    }
    if (masterGain && audioContext) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.08);
    }
  }

  toggleButton.addEventListener('click', () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  volumeInput.addEventListener('input', (event) => {
    volume = Number(event.target.value) / 100;
    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(isPlaying ? volume : 0.0001, audioContext.currentTime, 0.08);
    }
  });
}

renderWeekdays();
renderAll();
bindEvents();
createPianoPlaylist();
