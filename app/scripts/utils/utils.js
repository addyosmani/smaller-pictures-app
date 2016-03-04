class utils {

    constructor() {

    }

    convertDataURLToBlob(dataURL) {
      const BASE64_MARKER = ';base64,';
      let parts = [];
      let contentType = '';
      let raw = null;

      if (dataURL.indexOf(BASE64_MARKER) === -1) {
        parts = dataURL.split(',');
        contentType = parts[0].split(':')[1];
        raw = decodeURIComponent(parts[1]);
        return new Blob([raw], {
          type: contentType
        });
      }

      parts = dataURL.split(BASE64_MARKER);
      contentType = parts[0].split(':')[1];
      raw = window.atob(parts[1]);
      let rawLength = raw.length;
      let uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      return new Blob([uInt8Array], {
        type: contentType
      });
    }

    exportCompressedImage(imgElem) {
      if (!!imgElem && imgElem.src.length) {
        let blob = this.convertDataURLToBlob(imgElem.src);
        saveAs(blob, 'smaller-' + (new Date().toISOString()) + '.jpeg');
      }
    }

    getPixelsFromImageElement(imgElem) {
      const canvas = document.createElement('canvas');
      canvas.width = imgElem.width;
      canvas.height = imgElem.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElem, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    formatSizeUnits(bytes) {
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
}
