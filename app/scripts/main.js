
/* eslint-env browser */
(function() {
  'use strict';

  var APP_VERSION = 1.0241;
  console.log('Running Smaller Pics version ' + APP_VERSION);

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  // Snackbar
  var createSnackbar = (function() {
    // Any snackbar that is already shown
    var previous = null;
  /*
  <div class="paper-snackbar">
    <button class="action">Dismiss</button>
    This is a longer message that won't fit on one line. It is, inevitably, quite a boring thing. Hopefully it is still useful.
  </div>
  */
    return function(message, actionText, action) {
      if (previous) {
        previous.dismiss();
      }
      var snackbar = document.createElement('div');
      snackbar.className = 'paper-snackbar';
      snackbar.dismiss = function() {
        this.style.opacity = 0;
      };
      var text = document.createTextNode(message);
      snackbar.appendChild(text);
      if (actionText) {
        if (!action) {
          action = snackbar.dismiss.bind(snackbar);
        }
        var actionButton = document.createElement('button');
        actionButton.className = 'action';
        actionButton.innerHTML = actionText;
        actionButton.addEventListener('click', action);
        snackbar.appendChild(actionButton);
      }
      setTimeout(function() {
        if (previous === this) {
          previous.dismiss();
        }
      }.bind(snackbar), 1500);
      snackbar.addEventListener('transitionend', function(event) {
        if (event.propertyName === 'opacity' && this.style.opacity === 0) {
          this.parentElement.removeChild(this);
          if (previous === this) {
            previous = null;
          }
        }
      }.bind(snackbar));
      previous = snackbar;
      document.body.appendChild(snackbar);
      // getComputedStyle(snackbar).bottom;
      snackbar.style.bottom = '0px';
      snackbar.style.opacity = 1;
    };
  })();

  // Service Worker
  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      var isUpdate = false;
      // If this fires we should check if there's a new Service Worker
      // waiting to be activated. If so, ask the user to force refresh.
      if (registration.active) {
        isUpdate = true;
      }

      // Check to see if there's an updated version of service-worker.js with
      // new files to cache:
      // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-registration-update-method
      if (typeof registration.update === 'function') {
        registration.update();
      }

      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        // if (navigator.serviceWorker.controller) {
        // The updatefound event implies that registration.installing is set:
        // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
        registration.installing.onstatechange = function() {
          switch (this.state) {
            case 'installed':
              console.log('Service Worker Installed.');
              // At this point, the old content will have been purged and the
              // fresh content will have been added to the cache.
              // It's the perfect time to display a "New content is
              // available; please refresh." message in the page's interface.
              if (isUpdate) {
                // At this point, the old content will have been purged and the fresh content will
                // have been added to the cache.
                // It's the perfect time to display a "New content is available; please refresh."
                // message in the page's interface.
                console.log('App updated');
                createSnackbar('App updated. Restart for the new version.');
              } else {
                // At this point, everything has been precached.
                // It's the perfect time to display a "Content is cached for offline use." message.
                console.log('App ready for offline');
                createSnackbar('App ready for offline use.');
              }
              break;

            case 'redundant':
              throw new Error('The installing ' +
                              'service worker became redundant.');

            default:
              // Ignore
          }
        };
        // }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }
})();
