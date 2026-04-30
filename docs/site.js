(function () {
  var host = window.location.hostname;
  if (host === 'bridge-classroom.com' || host === 'localhost' || host === '127.0.0.1') return;

  // Update any footer text that references bridge-classroom.com
  document.querySelectorAll('.footer-copy').forEach(function (el) {
    el.innerHTML = el.innerHTML.replace(/bridge-classroom\.com/g, host);
  });

  // Update og:url meta tag
  var ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', ogUrl.getAttribute('content').replace('bridge-classroom.com', host));
  }
})();
