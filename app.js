const chapters = [...document.querySelectorAll('.chapter')];
const rail = document.getElementById('rail');
const currentIndex = document.getElementById('currentIndex');
const currentLabel = document.getElementById('currentLabel');
const navIndex = document.getElementById('navIndex');
const progressBar = document.getElementById('progressBar');
const notesPanel = document.getElementById('notesPanel');
const notesButton = document.getElementById('notesButton');
const notesMeta = document.getElementById('notesMeta');
const notesCopy = document.getElementById('notesCopy');
let activeIndex = 0;
let wheelLocked = false;

chapters.forEach((chapter, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `${String(index + 1).padStart(2, '0')} ${chapter.dataset.title}`);
  button.addEventListener('click', () => goTo(index));
  rail.append(button);
});

const railButtons = [...rail.querySelectorAll('button')];
const navTotal = document.getElementById('navTotal');
const total = String(chapters.length).padStart(2, '0');
if (navTotal) navTotal.textContent = total;
chapters.forEach((chapter, index) => {
  const num = chapter.querySelector('.foot-num');
  if (num) num.textContent = `${String(index + 1).padStart(2, '0')} / ${total}`;
});

// 1600x900 캔버스를 화면에 맞춰 통째로 축소한다
const CANVAS_W = 1600, CANVAS_H = 900, MARGIN = 26;
function fitCanvas() {
  const top = document.fullscreenElement ? 0 : (document.querySelector('.topbar')?.offsetHeight || 0);
  const k = Math.min(
    (window.innerWidth - MARGIN * 2) / CANVAS_W,
    (window.innerHeight - top - MARGIN * 2) / CANVAS_H
  );
  document.documentElement.style.setProperty('--k', String(Math.max(k, 0.1)));
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
document.addEventListener('fullscreenchange', fitCanvas);

function updateUI(index) {
  activeIndex = index;
  chapters.forEach((chapter, i) => chapter.classList.toggle('active', i === index));
  railButtons.forEach((button, i) => button.classList.toggle('active', i === index));
  const number = String(index + 1).padStart(2, '0');
  currentIndex.textContent = number;
  navIndex.textContent = number;
  currentLabel.textContent = chapters[index].dataset.label;
  progressBar.style.width = `${((index + 1) / chapters.length) * 100}%`;
  const note = chapters[index].querySelector('.speaker-note');
  notesMeta.textContent = `${number} · ${chapters[index].dataset.title}`;
  notesCopy.textContent = note ? note.content.textContent.trim() : '';
  document.title = `${number} ${chapters[index].dataset.title} — RFVisualizer`;
  syncVideos(index);
}

// 장면에 들어오면 자동 재생, 나가면 멈추고 처음으로 되감는다
function syncVideos(index) {
  chapters.forEach((chapter, i) => {
    chapter.querySelectorAll('video').forEach((video) => {
      if (i === index) {
        const playing = video.play();
        if (playing) playing.catch(() => {});
      } else if (!video.paused || video.currentTime) {
        video.pause();
        video.currentTime = 0;
      }
    });
  });
}

// 컨트롤을 띄우지 않으므로 클릭으로 일시정지한다
document.querySelectorAll('video.media-fill').forEach((video) => {
  video.style.cursor = 'pointer';
  video.addEventListener('click', () => {
    if (video.paused) { const p = video.play(); if (p) p.catch(() => {}); }
    else video.pause();
  });
});

function goTo(index) {
  const safeIndex = Math.max(0, Math.min(chapters.length - 1, index));
  chapters[safeIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateUI(safeIndex);
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  updateUI(chapters.indexOf(visible.target));
}, { threshold: [0.42, 0.64] });

chapters.forEach(chapter => observer.observe(chapter));
updateUI(0);

document.getElementById('prevButton').addEventListener('click', () => goTo(activeIndex - 1));
document.getElementById('nextButton').addEventListener('click', () => goTo(activeIndex + 1));

function toggleNotes(force) {
  const open = typeof force === 'boolean' ? force : !notesPanel.classList.contains('open');
  notesPanel.classList.toggle('open', open);
  notesPanel.setAttribute('aria-hidden', String(!open));
  notesButton.setAttribute('aria-pressed', String(open));
}

notesButton.addEventListener('click', () => toggleNotes());
document.getElementById('closeNotes').addEventListener('click', () => toggleNotes(false));

document.getElementById('fullscreenButton').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {}
});

// 레이저 포인터 — 위치만 갱신하므로 주사율과 무관하다
const laser = document.createElement('div');
laser.className = 'laser';
laser.setAttribute('aria-hidden', 'true');
document.body.append(laser);

let laserX = 0, laserY = 0, laserQueued = false;
function drawLaser() {
  laser.style.transform = `translate(${laserX}px, ${laserY}px)`;
  laserQueued = false;
}
document.addEventListener('pointermove', (event) => {
  laserX = event.clientX;
  laserY = event.clientY;
  if (!laserQueued) { laserQueued = true; requestAnimationFrame(drawLaser); }
}, { passive: true });

function toggleLaser(force) {
  const on = typeof force === 'boolean' ? force : !document.body.classList.contains('laser-on');
  document.body.classList.toggle('laser-on', on);
}

document.addEventListener('keydown', (event) => {
  if (document.getElementById('lightbox').open && event.key !== 'Escape') return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); goTo(activeIndex + 1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(activeIndex - 1); }
  if (event.key === 'Home') goTo(0);
  if (event.key === 'End') goTo(chapters.length - 1);
  if (event.key.toLowerCase() === 'n') toggleNotes();
  if (event.key.toLowerCase() === 'f') document.getElementById('fullscreenButton').click();
  if (event.key.toLowerCase() === 'l') toggleLaser();
  if (event.key === 'Escape') { toggleNotes(false); toggleLaser(false); }
});

document.addEventListener('wheel', (event) => {
  if (notesPanel.matches(':hover') || Math.abs(event.deltaY) < 34 || wheelLocked) return;
  wheelLocked = true;
  goTo(activeIndex + (event.deltaY > 0 ? 1 : -1));
  window.setTimeout(() => { wheelLocked = false; }, 650);
}, { passive: true });

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
document.querySelectorAll('[data-zoom]').forEach(trigger => {
  trigger.addEventListener('click', () => {
    lightboxImage.src = trigger.dataset.zoom;
    lightbox.showModal();
  });
});
document.getElementById('closeLightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });

let touchStartY = null;
document.addEventListener('touchstart', event => { touchStartY = event.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', event => {
  if (touchStartY === null || window.innerWidth < 1100) return;
  const distance = touchStartY - event.changedTouches[0].clientY;
  if (Math.abs(distance) > 60) goTo(activeIndex + (distance > 0 ? 1 : -1));
  touchStartY = null;
}, { passive: true });
