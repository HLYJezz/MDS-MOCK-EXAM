/* Optional, privacy-friendly visit counting.
   ---------------------------------------------------------------------------
   OFF until you fill in CONFIG below. While it is off, the site makes no
   network requests at all.

   What it can see: how many people opened the site, which paper they opened,
   where they came from, and roughly which country. It uses no cookies and
   does not identify anyone.

   What it never sees: answers, scores, or attempt history. Those stay in the
   visitor's own browser and are never sent anywhere.

   To turn it on:
     1. Make a free account at https://www.goatcounter.com (personal use).
        You choose a code, e.g. "mds-mock", giving you mds-mock.goatcounter.com.
     2. Put that code in CONFIG.site below and push.
     3. Your dashboard is at https://<code>.goatcounter.com

   Cloudflare Web Analytics works too: set provider to 'cloudflare' and put
   your token in site. It cannot label papers by name, so exam pages show up
   as /exam.html instead.
   --------------------------------------------------------------------------- */
(function () {
  var CONFIG = {
    provider: 'goatcounter',   // 'goatcounter' | 'cloudflare' | '' to disable
    site: ''                   // your GoatCounter code, or Cloudflare token
  };

  if (!CONFIG.site) return;    // not configured: do nothing, contact nobody

  /* Report the paper being sat by name, so the dashboard reads
     "/exam/mds211-gauntlet" rather than one lump of exam.html hits. */
  function friendlyPath() {
    var here = location.pathname.replace(/\/index\.html$/, '/');
    if (!/exam\.html$/.test(location.pathname)) return here;
    var subject = new URLSearchParams(location.search).get('subject');
    return subject ? '/exam/' + subject : '/exam';
  }

  var s = document.createElement('script');
  s.async = true;

  if (CONFIG.provider === 'cloudflare') {
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CONFIG.site }));
  } else {
    window.goatcounter = { path: friendlyPath() };
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + CONFIG.site + '.goatcounter.com/count');
  }

  document.head.appendChild(s);

  /* Say so on the page, but only when counting is actually switched on. */
  var note = document.getElementById('privacyNote');
  if (note) note.textContent = ' Anonymous visit counts are collected — never answers or scores.';
})();
