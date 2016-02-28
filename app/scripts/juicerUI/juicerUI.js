class juicerUI extends utils {
    constructor(jpegQuality = 75) {
      super();

      // Configuration
      this.prefs = ['webkit-slider-runnable', 'moz-range'];
      this.inprogress = false;

      this.dataURL = '';
      this.origImageData = null;
      this.origFileSize = 0;

      this.spinnerOpts = {
        lines: 7, // The number of lines to draw
        length: 80, // The length of each line
        width: 40, // The line thickness
        radius: 32, // The radius of the inner circle
        corners: 1.0, // Corner roundness (0..1)
        rotate: 19, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#ee66aa', // #rgb or #rrggbb or array of colors
        speed: 1.2, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        top: '50%', // Top position relative to parent in px
        left: '50%' // Left position relative to parent in px
      };

      // Elements
      this.l = document.querySelector('#quality');
      this.s = document.createElement('style');
      this.r = document.querySelector('input[type=range]');
      this.prefs = ['webkit-slider-runnable', 'moz-range'];
      this.picker = document.querySelector('#filepicker');
      this.labelForPicker = document.querySelector('#labelForPicker');
      this.saveBtn = document.querySelector('#saveBtn');
      this.dstImgElem = document.getElementById("dstimg");
      this.cta = document.querySelector('.cta');
      this.drawer = document.querySelector('#layout');
      this.newProject = document.querySelector('.new-project');
      this.compressionContainer = document.querySelector('.compression-container');
      this.layoutControlsHeader = document.querySelector('.layout__controls__header');
      this.compressionStatKB = document.querySelector('.compression-stat__kb');
      this.compressionStatPC = document.querySelector('.compression-stat__pc');
      this.compressionStatOldSize = document.querySelector('.compression-stat__os');

      // On construction, append our stylesheet
      document.body.appendChild(this.s);

      window.addEventListener('load', (e) => {

        // Init default encoding quality
        this.jpegQuality = jpegQuality;

        // Disable range selection
        this.disableRangeSelection();

        // Initialise events
        this.setupEvents();

      });
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
        const target = document.getElementById('spinner');
        this.spinner = new Spinner(this.spinnerOpts).spin(target);
        this.worker.postMessage(encoderOptions);
        this.inprogress = true;
      }

      this.worker.onmessage = (msg) => {
        switch (msg.data.reason) {
          case 'image':
            this.formatFilesizeInfo(this.origFileSize, msg.data.quality, msg.data.width, msg.data.height, msg.data.width * msg.data.height * 3, msg.data.bw, msg.data.encodetime);
            const url = msg.data.url;
            const imgElem = document.getElementById('img');

            this.dstImgElem.style.width = displayWidth;
            this.dstImgElem.setAttribute('src', url);
            this.inprogress = false;
            this.spinner.stop();

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

      this.picker.hidden = true;
      this.saveBtn.parentElement.hidden = false;
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
      //this.layoutControlsHeader.hidden = false;
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
      this.readFile(this.picker.files[0]);
      this.origFileSize = this.picker.files[0].size;
      this.hideCallToAction();
      this.enableRangeSelection();
      // Make sure the drawer is closed
      this.drawer.MaterialLayout.toggleDrawer();
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

      window.addEventListener('keypress', (e) => {
        if (e.keyCode === 13 && e.target === this.labelForPicker) {
          this.picker.click();
        }
      });

      /*change all*/
      this.r.addEventListener('change', (e) => {
        this.orchestrateEncode(this.r);
      });

      this.l.addEventListener('change', (e) => {
        this.orchestrateEncode(this.l);
      });
    }
}
