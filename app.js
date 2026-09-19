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
if (navTotal) navTotal.textContent = String(chapters.length).padStart(2, '0');

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
}

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

document.addEventListener('keydown', (event) => {
  if (document.getElementById('lightbox').open && event.key !== 'Escape') return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); goTo(activeIndex + 1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(activeIndex - 1); }
  if (event.key === 'Home') goTo(0);
  if (event.key === 'End') goTo(chapters.length - 1);
  if (event.key.toLowerCase() === 'n') toggleNotes();
  if (event.key.toLowerCase() === 'f') document.getElementById('fullscreenButton').click();
  if (event.key === 'Escape') toggleNotes(false);
});

document.addEventListener('wheel', (event) => {
  if (window.innerWidth < 1100 || notesPanel.matches(':hover') || Math.abs(event.deltaY) < 34 || wheelLocked) return;
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
