class juicerUI extends utils {
    constructor(jpegQuality = 75) {
      super();

      // Configuration
      this.prefs = ['webkit-slider-runnable', 'moz-range'];
      this.inprogress = false;

      this.dataURL = '';
      this.origImageData = null;
      this.origFileSize = 0;

      // Image Zoomer
      this.zoomer = new ImageZoomer();

      // Keyboard shortcuts
      this.ENTER_KEY = 13;
      this.ESCAPE_KEY = 27;
      this.TAB_KEY = 9;
      this.A11Y_OPEN_MENU = 'Open Menu.';

      // Elements
      this.l = document.querySelector('#quality');
      this.s = document.createElement('style');
      this.r = document.querySelector('input[type=range]');
      this.prefs = ['webkit-slider-runnable', 'moz-range'];
      this.picker = document.querySelector('#filepicker');
      this.labelForPicker = document.querySelector('#labelForPicker');
      this.saveBtn = document.querySelector('#saveBtn');
      this.dstImgElem = document.getElementById('dstimg');
      this.cta = document.querySelector('.cta');
      this.layout = document.querySelector('#layout');
      this.spinner = document.getElementById('spinner');

      this.fabFileSelect = document.querySelector('#fabFileSelect');
      this.newProject = document.querySelector('.new-project');
      this.compressionContainer = document.querySelector('.compression-container');
      this.layoutControlsHeader = document.querySelector('.layout__controls__header');
      this.compressionStatKB = document.querySelector('.compression-stat__kb');
      this.compressionStatPC = document.querySelector('.compression-stat__pc');
      this.compressionStatOldSize = document.querySelector('.compression-stat__os');
      this.dstImgBackground = document.querySelector('.output-background');

      // On construction, append our stylesheet
      document.body.appendChild(this.s);

      window.addEventListener('load', (e) => {

        // Post MDL initialisation
        this.drawer = this.layout.querySelector('.mdl-layout__drawer');
        this.drawerMenuButton = this.layout.querySelector('.mdl-layout__drawer-button');
        this.drawerNavigationItems = this.drawer.querySelectorAll('a');

        // Ensure MDL hamburger has aria-label set
        // https://github.com/addyosmani/smaller-pictures-app/issues/4
        this.drawerMenuButton.setAttribute('aria-label', this.A11Y_OPEN_MENU);

        // Init default encoding quality
        this.jpegQuality = jpegQuality;

        // Disable range selection
        this.disableRangeSelection();

        // Initialise events
        this.setupEvents();

        // Run Easter Egg
        this.runEasterEgg();

      });
    }

    startSpinner() {
      // Avoid scheduling encode if in progress
      this.spinner.classList.add('is-active');
    }

    stopSpinner() {
      this.spinner.classList.remove('is-active');
    }

    encode(quality = 75) {

      const displayWidth = '100%'; //calc(100% / 1.5)'; //100%';
      // Create Web Worker instance on the global
      if (this.worker === undefined) {
        this.worker = new Worker('scripts/encoder.js');
      }

      const encoderOptions = {
        'quality': quality,
        'imageData': this.origImageData,
        'width': this.origImageData.width,
        'height': this.origImageData.height
      };

      // Avoid scheduling encode if in progress
      if (!this.inprogress) {
        this.startSpinner();
        this.worker.postMessage(encoderOptions);
        this.inprogress = true;
      }

      this.worker.onmessage = (msg) => {
        switch (msg.data.reason) {
          case 'image':
            this.formatFilesizeInfo(this.origFileSize, msg.data.quality, msg.data.width, msg.data.height, msg.data.width * msg.data.height * 3, msg.data.bw, msg.data.encodetime);
            const url = msg.data.url;
            const imgElem = document.getElementById('img');

            // this.dstImgElem.style.width = displayWidth;
            this.dstImgElem.setAttribute('src', url);
            this.inprogress = false;
            this.stopSpinner();

            // Switch on the zoomer, capture the new image.
            this.zoomer.enabled = true;
            this.zoomer.onResize();

            // Re-enable range selection
            this.enableRangeSelection();
            break;
          case 'log':
            // console.log(msg.data.log);
          default:
            break;
        }
      };
    }

    getValStr(el, pv) {
      const min = el.min || 0;
      pv = pv || el.value;
      const perc = (el.max) ? ~~(100 * (pv - min) / (el.max - min)) : pv;
      const val = perc + '% 100%,100% 100%,100% 100%';

      return val;
    }

    getTrackStyleStr(el, val) {
      let str = '';
      const len = this.prefs.length;

      for (let i = 0; i < len; i++) {
        str += '.js input[type=range]::-' + this.prefs[i] +
          '-track{background-size:' + val + '}';
      }

      return str;
    }

    get jpegQuality() {
      return parseInt(this.r.value, 10) || 75;
    }

    set jpegQuality(value) {
      if (value) {
        // this.r.value = value;
        this.r.MaterialSlider.change(value);
        this.l.value = value;
        this.s.textContent = this.getTrackStyleStr(this.r, this.getValStr(this.r));
      }
    }

    orchestrateEncode(el) {
      this.jpegQuality = el.value;
      this.disableRangeSelection();
      this.encode(this.jpegQuality);
    }

    enableRangeSelection() {
      for (let elem of [this.l, this.r, this.saveBtn]) {
        elem.disabled = false;
      }
      this.r.focus();

      this.picker.parentElement.hidden = true;
      this.saveBtn.parentElement.hidden = false;
      this.stopSpinner();
    }

    disableRangeSelection() {
      for (let elem of [this.l, this.r, this.saveBtn]) {
        elem.disabled = true;
      }
    }

    showCompressionContainer() {
      this.compressionContainer.classList.add('fade-in');
    }

    showLayoutControlsHeader() {
      this.layoutControlsHeader.classList.add('fade-in');
    }

    readFile(fileUrl) {
      if (fileUrl) {
        const reader = new FileReader();
        reader.readAsDataURL(fileUrl);
        reader.onload = (e) => {
          const origUrl = reader.result;
          const out = document.createElement('img');
          out.style.width = '';
          out.setAttribute('src', origUrl);
          out.onload = (e) => {
            this.showCompressionContainer();
            this.showLayoutControlsHeader();
            this.origImageData = this.getPixelsFromImageElement(out);
            this.encode(this.jpegQuality);
          };
        };
        reader.onerror = (e) => {
          console.log('Error', e);
        };
      }
    }

    formatFilesizeInfo(origFileSize, quality, w, h, inbytes, outbytes) {
      const oldSize = origFileSize;
      const newSize = outbytes;
      this.compressionStatKB.textContent = this.formatSizeUnits(newSize);
      this.compressionStatOldSize.textContent = this.formatSizeUnits(oldSize);
      this.compressionStatPC.textContent = (100 - (newSize / oldSize) * 100).toFixed(1) + '%';
    }

    hideCallToAction() {
      this.cta.remove();
    }

    runPhotoSelection() {
      if (this.picker.files[0]) {
        // Start spinner early to provide visual feedback
        this.startSpinner();
        // Attempt file reads
        this.readFile(this.picker.files[0]);
        this.origFileSize = this.picker.files[0].size;
        this.hideCallToAction();
        this.enableRangeSelection();
        // Make sure the drawer is closed
        document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
        document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
      } else {
        console.log('Error: unable to select files');
        this.stopSpinner();
      }

    }

    handleDrawerKeyboardTraps(e) {
      // https://github.com/addyosmani/smaller-pictures-app/issues/7
      // Throttle check to only occur when the drawer is visible
      if (this.drawer.classList.contains('is-visible')) {
        // if tab or shift-tab pressed
        if (e.keyCode === this.TAB_KEY) {
          // Get list of focusable items
          let focusableItems = this.drawerNavigationItems;
          // Get the number of focusable items
          let numberOfFocusableItems = focusableItems.length;
          // Get currently focused item
          let focusedItem = document.activeElement;
          let focusedItemIndex =  0;

          if (numberOfFocusableItems > 0) {
            // Get the index of the currently focused item
            for (let i = 0; i < numberOfFocusableItems; i++) {
              if (focusableItems[i] === focusedItem) {
                focusedItemIndex = i;
              }
            }

            if (e.shiftKey) {
              // Back tab
              // If focused on first item and user presses back-tab, go to
              // the last focusable item
              if (focusedItemIndex === 0) {
                focusableItems[numberOfFocusableItems - 1].focus();
                e.preventDefault();
              }
            } else {
              if (focusedItemIndex === numberOfFocusableItems - 1) {
                  focusableItems[0].focus();
                  e.preventDefault();
              }
            }
          }
        }
      }
    }

    setupEvents() {
      this.picker.addEventListener('change', (e) => {
        this.runPhotoSelection();
      });

      this.saveBtn.addEventListener('click', (e) => {
        this.exportCompressedImage(this.dstImgElem);
      });

      this.cta.addEventListener('click', (e) => {
        this.picker.click();
      });

      this.newProject.addEventListener('click', (e) => {
        this.picker.click();
      });

      window.addEventListener('keydown', (e) => {
        this.handleDrawerKeyboardTraps(e);
      });

      window.addEventListener('keyup', (e) => {
        if (e.keyCode === this.ENTER_KEY && e.target === this.labelForPicker) {
          this.picker.click();
        }

        // Support cancelling out of offscreen drawer menu
        // https://github.com/addyosmani/smaller-pictures-app/issues/3
        if (e.keyCode === this.ESCAPE_KEY && (e.target === this.drawerMenuButton)) {
          this.layout.MaterialLayout.toggleDrawer(true);
        }
      });

      this.r.addEventListener('change', (e) => {
        this.orchestrateEncode(this.r);
      });

      this.l.addEventListener('change', (e) => {
        this.orchestrateEncode(this.l);
      });
    }

    runEasterEgg() {
      // DevTools styled console log.
      const cssStyle = "font-size: 200px; color: hsl(330, 100%, 50%); text-shadow: 0 2px 0 hsl(330, 100%, 25%), 0 3px 2px hsla(330, 100%, 15%, 0.5), /* next */ 0 3px 0 hsl(350, 100%, 50%), 0 5px 0 hsl(350, 100%, 25%), 0 6px 2px hsla(350, 100%, 15%, 0.5), /* next */ 0 6px 0 hsl(20, 100%, 50%), 0 8px 0 hsl(20, 100%, 25%), 0 9px 2px hsla(20, 100%, 15%, 0.5), /* next */ 0 9px 0 hsl(50, 100%, 50%), 0 11px 0 hsl(50, 100%, 25%), 0 12px 2px hsla(50, 100%, 15%, 0.5), /* next */ 0 12px 0 hsl(70, 100%, 50%), 0 14px 0 hsl(70, 100%, 25%), 0 15px 2px hsla(70, 100%, 15%, 0.5), /* next */ 0 15px 0 hsl(90, 100%, 50%), 0 17px 0 hsl(90, 100%, 25%), 0 17px 2px hsla(90, 100%, 15%, 0.5); font-family: 'Mr Dafoe', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;";
      console.log("%c yolo!", cssStyle);
    }
}
