/**
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

class ImageZoomer {
  constructor () {
    this.element = document.querySelector('.zoomer');
    this.target = document.querySelector('.image-canvas');
    this.canvas = document.querySelector('.zoomer__canvas');
    this.ctx = this.canvas.getContext('2d');

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.update = this.update.bind(this);
    this.onResize = this.onResize.bind(this);

    this.targetBCR = null;
    this.zoomed = 0;
    this.targetZoomed = 0;

    this.x = 0;
    this.y = 0;
    this.trackingTouch = false;
    this.scheduledUpdate = false;
    this.enabled_ = false;

    this.initCanvas();
    this.addEventListeners();

  }

  set enabled (enabled_) {
    this.enabled_ = enabled_;
  }

  get enabled () {
    return this.enabled_;
  }

  initCanvas () {
    const width = 128;
    const height = 128;
    const dPR = window.devicePixelRatio || 1;

    this.canvas.width = width * dPR;
    this.canvas.height = height * dPR;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(dPR, dPR);
  }

  onResize () {

    const bcr = this.target.getBoundingClientRect();

    this.targetBCR = {
      left: bcr.left,
      right: bcr.right,
      top: bcr.top,
      bottom: bcr.bottom,
      width: bcr.width,
      height: bcr.height
    };

    // Update the BCR based on the image object fit.
    const fit = window.getComputedStyle(this.target).objectFit;
    const widthRatio = (this.targetBCR.width / this.target.naturalWidth);
    const heightRatio = (this.targetBCR.height / this.target.naturalHeight);
    let ratio = 1;

    if (fit === 'contain') {
      ratio = Math.min(widthRatio, heightRatio);
    } else if (fit === 'cover') {
      ratio = Math.max(widthRatio, heightRatio);
    }

    this.targetBCR.width = this.target.naturalWidth * ratio;
    this.targetBCR.height = this.target.naturalHeight * ratio;

    this.targetBCR.left += (bcr.width - this.targetBCR.width) * 0.5;
    this.targetBCR.top += (bcr.height - this.targetBCR.height) * 0.5;
  }

  onStart (evt) {

    if (!this.enabled)
      return;

    if (evt.target !== this.target)
      return;

    this.x = evt.pageX || evt.touches[0].pageX;
    this.y = evt.pageY || evt.touches[0].pageY;

    evt.preventDefault();
    this.trackingTouch = true;

    this.targetZoomed = 1;
    requestAnimationFrame(this.update);
  }

  onMove (evt) {
    if (!this.trackingTouch)
      return;

    this.x = evt.pageX || evt.touches[0].pageX;
    this.y = evt.pageY || evt.touches[0].pageY;

  }

  onEnd () {
    this.trackingTouch = false;
    this.targetZoomed = 0;
  }

  update () {

    const TAU = Math.PI * 2;
    const MAX_RADIUS = 46;
    const radius = this.zoomed * MAX_RADIUS;

    const targetX = (this.x - this.targetBCR.left) / this.targetBCR.width;
    const targetY = (this.y - this.targetBCR.top) / this.targetBCR.height;
    const imageScale = 3;
    const scaledTargetWidth = this.targetBCR.width * imageScale;
    const scaledTargetHeight = this.targetBCR.height * imageScale;

    // Shadow.
    this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowOffsetY = 8;

    // Background.
    this.ctx.clearRect(0, 0, 128, 128);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(64, 110 - radius, radius, 0, TAU);
    this.ctx.closePath();
    this.ctx.fill();

    // Zoomed image.
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(64, 110 - (radius + 1), radius * 1.03, 0, TAU);
    this.ctx.clip();
    this.ctx.closePath();
    this.ctx.drawImage(this.target,
        -targetX * scaledTargetWidth + 64, -targetY * scaledTargetHeight + 64,
        scaledTargetWidth,
        scaledTargetHeight);
    this.ctx.restore();

    // Position the parent element.
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

    // Update the zoom value.
    this.zoomed += (this.targetZoomed - this.zoomed) / 3;

    // Schedule another update if the zoom is fairly non-zero.
    if (this.zoomed > 0.001) {
      requestAnimationFrame(this.update);
    } else {
      this.zoomed = 0;
    }
  }

  addEventListeners () {
    document.addEventListener('touchstart', this.onStart);
    document.addEventListener('touchmove', this.onMove);
    document.addEventListener('touchend', this.onEnd);

    document.addEventListener('mousedown', this.onStart);
    document.addEventListener('mousemove', this.onMove);
    document.addEventListener('mouseup', this.onEnd);
    window.addEventListener('resize', this.onResize);
  }

  removeEventListeners () {
    document.removeEventListener('touchstart', this.onStart);
    document.removeEventListener('touchmove', this.onMove);
    document.removeEventListener('touchend', this.onEnd);

    document.removeEventListener('mousedown', this.onStart);
    document.removeEventListener('mousemove', this.onMove);
    document.removeEventListener('mouseup', this.onEnd);
    window.removeEventListener('resize', this.onResize);
  }
}

window.ImageZoomer = ImageZoomer;
