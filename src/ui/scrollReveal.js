export function observePageSections({ root, viewportHeight, documentScrollTop = 0, prefersReducedMotion, motionIntensity = 'enhanced', IntersectionObserverImpl }) {
  if (!root || (prefersReducedMotion && motionIntensity !== 'immersive') || typeof IntersectionObserverImpl !== 'function') return null;

  const sections = [...root.querySelectorAll('.page-shell .page-body > *')]
    .filter((section) => section.getBoundingClientRect().top + documentScrollTop >= viewportHeight);

  if (!sections.length) return null;

  const observer = new IntersectionObserverImpl((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('scroll-reveal-pending');
      entry.target.classList.add('scroll-reveal-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -56px 0px' });

  for (const section of sections) {
    section.classList.add('scroll-reveal-pending');
    observer.observe(section);
  }

  return observer;
}
