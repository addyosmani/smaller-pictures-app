(function(document, window, spinner) {
  'use strict';

  var jpegQuality = 75;
  var l = document.querySelector('#quality');
  var s = document.createElement('style');
  var r = document.querySelector('input[type=range]');
  var prefs = ['webkit-slider-runnable', 'moz-range'];
  var picker = document.querySelector('#filepicker');
  var saveBtn = document.querySelector('#saveBtn');
  var dstImgElem = document.getElementById("dstimg");

  var compressionStatKB = document.querySelector('.compression-stat__kb');
  var compressionStatPC = document.querySelector('.compression-stat__pc');
  var compressionStatOldSize = document.querySelector('.compression-stat__os');
  var inprogress = false;
  // this variables contains a copy of the ImageData buffer for the original image
  var origFileSize = 0;
  var origImageData;
  var origUrl = '';
  var dataURL = '';

  /**
   * The spinner object from spin.js
   */
  var opts = {
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


  document.body.appendChild(s);

  var getTrackStyleStr = function(el, val) {
    var str = '';
    var len = prefs.length;

    for (var i = 0; i < len; i++) {
      str += '.js input[type=range]::-' + prefs[i] +
        '-track{background-size:' + val + '}';
    }

    return str;
  };

  var getValStr = function(el, p) {
    var min = el.min || 0;
    var p = p || el.value;
    var perc = (el.max) ? ~~(100 * (p - min) / (el.max - min)) : p;
    var val = perc + '% 100%,100% 100%,100% 100%';

    return val;
  };

  function main() {
    setJPEGQuality(jpegQuality);
    disableRangeSelection();
  }

  function getJPEGQuality() {
    return parseInt(r.value, 10);
  }

  function setJPEGQuality(val) {
    r.value = val;
    l.value = val;
    s.textContent = getTrackStyleStr(r, getValStr(r));
  }

  /**
   * Returns an ImageData object
   * @param imgElem
   */
  function getPixelsFromImageElement(imgElem) {
    // imgElem must be on the same server otherwise a cross-origin error will be thrown "SECURITY_ERR: DOM Exception 18"
    // you can lauch chrome with --allow-file-access-from-files to avoid this on local file access. Http access should work fine
    // if pulling images from the same domain
    var canvas = document.createElement("canvas");
    canvas.width = imgElem.width;
    canvas.height = imgElem.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(imgElem, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }



  function readfile(f) {
    var reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = function() {
      origUrl = reader.result;
      //var out = document.getElementById("img");
      var out = document.createElement("img");
      out.style.width = "";
      out.setAttribute('src', origUrl);
      out.onload = function() {
        origImageData = getPixelsFromImageElement(out);
        do_encode(getJPEGQuality());
      }
    }

    reader.onerror = function(e) { // If anything goes wrong
      console.log("Error", e); // Just log it
    };
  }

  function formatSizeUnits(bytes) {
    if (bytes >= 1000000000) {
      bytes = (bytes / 1000000000).toFixed(2) + ' GB';
    } else if (bytes >= 1000000) {
      bytes = (bytes / 1000000).toFixed(1) + ' MB';
    } else if (bytes >= 1000) {
      bytes = (bytes / 1000).toFixed(0) + ' KB';
    } else if (bytes > 1) {
      bytes = bytes + ' bytes';
    } else if (bytes === 1) {
      bytes = bytes + ' byte';
    } else {
      bytes = '0 byte';
    }
    return bytes;
  }

  var format_info = function(quality, w, h, inbytes, outbytes) {
    var oldSize = origFileSize;
    var newSize = outbytes;
    compressionStatKB.textContent = formatSizeUnits(newSize);
    compressionStatOldSize.textContent = formatSizeUnits(oldSize);
    compressionStatPC.textContent = (100 - (newSize / oldSize) * 100).toFixed(1) + '%';
  }

  var do_encode = function(quality) {
    var displayWidth = '100%';
    // create web worker instance on global object
    if (typeof worker === 'undefined') {
      var worker = new window.Worker("scripts/pttjpeg.js");
    }
    var m = {
      'quality': quality,
      'imageData': origImageData,
      'width': origImageData.width,
      'height': origImageData.height
    };

    // Don't schedule encode if it's in progress
    // we can do this because the single threadness of this module is guaranteed
    if (!inprogress) {
      var target = document.getElementById('spinner');
      spinner = new Spinner(opts).spin(target);
      worker.postMessage(m);
      inprogress = true;
    }
    worker.onmessage = function(msg) {
      switch (msg.data.reason) {
        case 'image':
          format_info(msg.data.quality, msg.data.width, msg.data.height, msg.data.width * msg.data.height * 3, msg.data.bw, msg.data.encodetime);

          var url = msg.data.url;
          var imgElem = document.getElementById("img");

          dstImgElem.style.width = displayWidth;
          dstImgElem.setAttribute("src", url);

          inprogress = false;
          spinner.stop();

          // Now re-enable selection
          enableRangeSelection();
          break;
        case 'log':
          // console.log(msg.data.log);
          break;
        default:
          break;
      }
    }
  }


  function dataURLToBlob(dataURL) {
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
      var parts = dataURL.split(',');
      var contentType = parts[0].split(':')[1];
      var raw = decodeURIComponent(parts[1]);

      return new Blob([raw], {
        type: contentType
      });
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {
      type: contentType
    });
  }

  function exportCompressedImage() {
    var output = dstImgElem.src;
    if (dstImgElem.src.length) {
      var blob = dataURLToBlob(dstImgElem.src);
      saveAs(blob, "export.jpeg");
    }
  }

  r.addEventListener('input', function() {
    setJPEGQuality(this.value);
    disableRangeSelection();
    do_encode(getJPEGQuality() | 0);
  }, false);


  l.addEventListener('input', function() {
    setJPEGQuality(this.value);
    disableRangeSelection();
    do_encode(getJPEGQuality() | 0);
  }, false);

  function disableRangeSelection() {
    l.disabled = true;
    r.disabled = true;
    saveBtn.disabled = true;
  }

  function enableRangeSelection() {
    l.disabled = false;
    r.disabled = false;
    saveBtn.disabled = false;
  }

  picker.addEventListener('change', function() {
    readfile(this.files[0]);
    origFileSize = this.files[0].size;
    enableRangeSelection();
  }, false);

  saveBtn.addEventListener('click', function() {
    exportCompressedImage();
  }, false);

  main();

})(document, window, spinner);
