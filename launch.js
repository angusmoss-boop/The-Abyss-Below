/* Branding only: never reads, writes or migrates a campaign. */
(() => {
  'use strict';
  const root = document.documentElement;
  const buildId = '0.23.0-sunken-strongholds-1';
  let finished = false, reason = 'loading', ready = false, imageTimer, finishTimer;
  root.classList.add('abyss-launching');
  // A missing/corrupt game or an unavailable image must never trap the menu.
  const watchdog = setTimeout(() => finish('startup-timeout'), 8000);
  const holdTab = event => {
    if (!finished && event.key === 'Tab') {
      event.preventDefault();
      document.getElementById('launchScreen')?.focus({preventScroll:true});
    }
  };
  document.addEventListener('keydown', holdTab, true);
  function finish(why) {
    if (finished) return;
    finished = true; reason = why;
    clearTimeout(watchdog); clearTimeout(imageTimer);
    document.removeEventListener('keydown', holdTab, true);
    const panel = document.getElementById('launchScreen');
    const active = document.activeElement === panel;
    panel?.classList.add('leaving');
    panel?.setAttribute('aria-hidden', 'true');
    const hide = () => {
      root.classList.remove('abyss-launching');
      if (panel) panel.hidden = true;
      if (active) document.getElementById('startBtn')?.focus({preventScroll:true});
    };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !panel) hide(); else finishTimer = setTimeout(hide, 260);
  }
  function gameReady() {
    if (finished || ready) return;
    ready = true;
    const image = document.getElementById('launchArt');
    // Wait for actual artwork decode, not a fake progress bar or enforced intro.
    // A slow/missing image has a bounded wait; the game itself remains usable.
    imageTimer = setTimeout(() => finish('image-timeout'), 1500);
    const decoded = image?.decode ? image.decode() : Promise.resolve();
    decoded.then(() => finish('ready'), () => finish('image-unavailable'));
  }
  window.AbyssLaunch = Object.freeze({buildId, ready:gameReady, status:() => ({ready,finished,reason})});
  window.addEventListener('pageshow', event => {
    if (event.persisted) { clearTimeout(finishTimer); finished = true; root.classList.remove('abyss-launching'); const p=document.getElementById('launchScreen'); if(p)p.hidden=true; }
  });
})();
