export function initNovaBar() {
  let novaLock = false;

  const convertImgToInlineSVG = () => {
    const iconImgs = document.querySelectorAll("img.nova-icon");
    const conversions = Array.from(iconImgs).map(img =>
      fetch(img.src)
        .then(res => res.text())
        .then(svgText => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, "image/svg+xml");
          const svg = doc.querySelector("svg");
          if (!svg) return;
          svg.classList.add("nova-icon");
          const wrapper = img.closest('.nova-item');
          if (wrapper?.dataset.section) {
            svg.setAttribute("data-section", wrapper.dataset.section);
          }
          img.replaceWith(svg);
        })
        .catch(err => console.warn("NovaBar: erreur SVG →", err))
    );
    return Promise.all(conversions);
  };

  const setupNovaBar = () => {
    const sections = [
      'home', 'gpio', 'temp', 'storage',
      'bt', 'network', 'info-sys', 'actions'
    ];

    const items = document.querySelectorAll('.nova-item');
    const laser = document.querySelector('.nova-laser');

    if (!items.length || !laser) return;

    items.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.section;
        const section = document.getElementById(id);
        if (!section) return;

        novaLock = true;
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        laser.style.top = `${item.offsetTop}px`;

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => {
          novaLock = false;
        }, 800);
      });
    });

    const updateLaser = () => {
      if (novaLock) return;

      const sectionsInView = [];
      sections.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            sectionsInView.push({ index: i, center: rect.top + rect.height / 2 });
          }
        }
      });

      if (!sectionsInView.length) return;

      let closestIndex = sectionsInView[0].index;
      let minDist = Infinity;
      const screenCenter = window.innerHeight / 2;

      sectionsInView.forEach(s => {
        const dist = Math.abs(s.center - screenCenter);
        if (dist < minDist) {
          minDist = dist;
          closestIndex = s.index;
        }
      });

      const activeItem = items[closestIndex];
      if (activeItem) {
        items.forEach(i => i.classList.remove('active'));
        activeItem.classList.add('active');
        requestAnimationFrame(() => {
          laser.style.top = `${activeItem.offsetTop}px`;
        });
      }
    };

    window.addEventListener('scroll', updateLaser, { passive: true });
    window.addEventListener('resize', updateLaser);
    window.addEventListener('load', updateLaser);
    updateLaser();
  };

  convertImgToInlineSVG().then(setupNovaBar);
}

