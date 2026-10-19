(function () {
  // external links open in a new tab; in-page anchors and the language switch stay in place
  document.querySelectorAll('a[href^="http"]').forEach(function (a) {
    if (a.hostname === location.hostname) return;
    a.target = '_blank';
    a.rel = 'noopener';
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || typeof gtag !== 'function') return;
    gtag('event', 'click', {
      event_category: 'link',
      event_label: a.getAttribute('href')
    });
  });
})();
