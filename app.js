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

const methods = {
  raw: {
    image: 'assets/raw-sionna.png',
    alt: 'Raw Sionna RT RF 분포',
    description: '3D 공간에서 반사와 차폐를 계산해 RF의 기본 구조를 만듭니다.',
    formula: ['Geometry', '+', 'Materials', '=', 'Physics'],
    title: '물리 시뮬레이션',
    summary: '벽과 복도 구조를 반영하지만, 실제 재질과 문 상태를 완벽하게 입력하기 어렵습니다.'
  },
  plain: {
    image: 'assets/plain-idw.svg',
    alt: '실제 측정값만 거리 가중치로 보간한 Plain IDW 개념도',
    description: '실제 측정값만 사용해 가까운 지점에 더 큰 가중치를 주고 빈 위치를 채웁니다.',
    formula: ['Measured', '+', 'Distance', '=', 'IDW'],
    title: '측정값 거리 보간',
    summary: '계산이 빠르고 실측값을 직접 반영하지만, 벽과 복도 같은 공간 구조는 고려하지 못합니다.'
  },
  corrected: {
    image: 'assets/residual-idw.png',
    alt: 'Residual IDW로 보정한 RF 분포',
    description: '실제값과 Sionna 예측값의 차이인 잔차를 보간해 원래 시뮬레이션에 더합니다.',
    formula: ['Sionna', '+', 'Residual IDW', '=', 'Corrected'],
    title: '시뮬레이션 오차 보정',
    summary: '공간 구조와 현장 측정을 결합해 이번 실험에서 가장 낮은 오차를 기록했습니다.'
  }
};

document.querySelectorAll('.method-tab').forEach(button => {
  button.addEventListener('click', () => {
    const method = methods[button.dataset.method];
    document.querySelectorAll('.method-tab').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    const image = document.getElementById('methodImage');
    image.src = method.image;
    image.alt = method.alt;
    image.closest('[data-zoom]').dataset.zoom = method.image;
    document.getElementById('methodDescription').textContent = method.description;
    document.getElementById('methodFormula').innerHTML = method.formula.map((part, i) => {
      if (['+', '−', '='].includes(part)) return `<i>${part}</i>`;
      return i === method.formula.length - 1 ? `<strong>${part}</strong>` : `<span>${part}</span>`;
    }).join('');
    document.getElementById('methodSummary').innerHTML = `<b>${method.title}</b><p>${method.summary}</p>`;
  });
});

const viewerScene = document.getElementById('viewerScene');
document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
    const mode = button.dataset.view;
    viewerScene.classList.remove('raw', 'plain');
    if (mode !== 'residual') viewerScene.classList.add(mode);
    document.getElementById('viewerMode').textContent = {
      raw: 'RAW SIONNA',
      plain: 'PLAIN IDW',
      residual: 'RESIDUAL IDW'
    }[mode];
  });
});

document.querySelectorAll('[data-height]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-height]').forEach(item => item.classList.toggle('active', item === button));
    const height = Number(button.dataset.height);
    document.getElementById('heightLabel').textContent = `Z ${height.toFixed(2)} m`;
    document.getElementById('rfPlane').style.transform = `perspective(700px) rotateX(66deg) translateY(${18 - (height - 1.25) * 22}%)`;
  });
});

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
