(function() {
  
  
  if (typeof window.CameraPreview !== 'undefined') {
    
    window.dispatchEvent(new CustomEvent('cap-camera-preview-ready'));
    return;
  }

  
  
  class CameraPreview {
    constructor(options = {}) {
    this.container = null;
    this.videoElement = null;
    this.stream = null;
    this.size = 'sm';
    this.shape = 'round';
    this.mirrored = false;
    this.position = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.videoDimensions = null;
    this.isInPictureInPicture = false;
    this.onClose = options.onClose || null;
    this.rafId = null;
    
    this.WINDOW_PADDING = 20;
    this.BAR_HEIGHT = 68;
  }

  getPreviewMetrics() {
    const base = this.size === 'sm' ? 230 : 400;

    if (!this.videoDimensions || this.videoDimensions.height === 0) {
      return {
        base,
        width: base,
        height: base,
        aspectRatio: 1,
      };
    }

    const aspectRatio = this.videoDimensions.width / this.videoDimensions.height;

    if (this.shape !== 'full') {
      return {
        base,
        width: base,
        height: base,
        aspectRatio,
      };
    }

    if (aspectRatio >= 1) {
      return {
        base,
        width: base * aspectRatio,
        height: base,
        aspectRatio,
      };
    }

    return {
      base,
      width: base,
      height: base / aspectRatio,
      aspectRatio,
    };
  }

  async startCamera(deviceId) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
        },
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }
    } catch (err) {
      
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  createPreviewWindow() {
    this.container = document.createElement('div');
    this.container.id = 'cap-camera-preview';
    this.container.className = 'cap-camera-preview-container';

    const metrics = this.getPreviewMetrics();
    const defaultX = window.innerWidth - metrics.width - this.WINDOW_PADDING;
    const defaultY = window.innerHeight - (metrics.height + this.BAR_HEIGHT) - this.WINDOW_PADDING;
    
    this.position = { x: defaultX, y: defaultY };

    this.container.innerHTML = `
      <div class="cap-preview-bar" data-controls>
        <button class="cap-preview-btn" data-action="close" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button class="cap-preview-btn" data-action="size" title="Toggle Size">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button class="cap-preview-btn" data-action="shape-round" title="Round">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </button>
        <button class="cap-preview-btn" data-action="shape-square" title="Square">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          </svg>
        </button>
        <button class="cap-preview-btn" data-action="shape-full" title="Full">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
          </svg>
        </button>
        <button class="cap-preview-btn" data-action="pip" title="Picture in Picture">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
            <rect x="13" y="10" width="7" height="5" rx="1"></rect>
          </svg>
        </button>
      </div>
      <div class="cap-preview-video-container">
        <video autoplay playsinline muted class="cap-preview-video"></video>
        <div class="cap-preview-loader hidden">
          <svg class="cap-preview-spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
          </svg>
        </div>
      </div>
    `;

    this.videoElement = this.container.querySelector('.cap-preview-video');
    
    this.updatePosition();
    this.updateSize();
    this.updateShape();
    this.attachEventListeners();

    document.body.appendChild(this.container);

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.videoDimensions = {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight,
      };
      this.updateSize();
      this.updatePosition();
      this.container.querySelector('.cap-preview-loader').classList.add('hidden');
    });
  }

  attachEventListeners() {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));

    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    if (document.pictureInPictureEnabled) {
      this.videoElement.addEventListener('enterpictureinpicture', () => {
        this.isInPictureInPicture = true;
        this.container.classList.add('in-pip');
      });

      this.videoElement.addEventListener('leavepictureinpicture', () => {
        this.isInPictureInPicture = false;
        this.container.classList.remove('in-pip');
      });
    }
  }

  handleMouseDown(e) {
    if (e.target.closest('button')) {
      return;
    }
    
    e.preventDefault();
    this.isDragging = true;
    this.dragStart = {
      x: e.clientX - this.position.x,
      y: e.clientY - this.position.y,
    };
    this.container.classList.add('dragging');
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      const newX = e.clientX - this.dragStart.x;
      const newY = e.clientY - this.dragStart.y;

      const metrics = this.getPreviewMetrics();
      const totalHeight = metrics.height + this.BAR_HEIGHT;
      const maxX = Math.max(0, window.innerWidth - metrics.width);
      const maxY = Math.max(0, window.innerHeight - totalHeight);

      this.position = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };

      this.updatePosition();
      this.rafId = null;
    });
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.classList.remove('dragging');
    }
  }

  handleAction(action) {
    switch (action) {
      case 'size':
        this.size = this.size === 'sm' ? 'lg' : 'sm';
        this.updateSize();
        break;
      case 'shape-round':
        this.shape = 'round';
        this.updateShape();
        break;
      case 'shape-square':
        this.shape = 'square';
        this.updateShape();
        break;
      case 'shape-full':
        this.shape = 'full';
        this.updateShape();
        break;
      case 'mirror':
        this.mirrored = !this.mirrored;
        this.updateMirror();
        break;
      case 'pip':
        this.togglePictureInPicture();
        break;
      case 'close':
        this.close();
        break;
    }
  }

  updatePosition() {
    if (this.container && this.position) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    }
  }

  updateSize() {
    if (!this.container) return;

    const metrics = this.getPreviewMetrics();
    this.container.style.width = `${metrics.width}px`;
    
    const videoContainer = this.container.querySelector('.cap-preview-video-container');
    videoContainer.style.height = `${metrics.height}px`;

    const totalHeight = metrics.height + this.BAR_HEIGHT;
    const maxX = Math.max(0, window.innerWidth - metrics.width);
    const maxY = Math.max(0, window.innerHeight - totalHeight);

    if (this.position) {
      this.position = {
        x: Math.max(0, Math.min(this.position.x, maxX)),
        y: Math.max(0, Math.min(this.position.y, maxY)),
      };
      this.updatePosition();
    }
  }

  updateShape() {
    if (!this.container) return;

    this.container.classList.remove('shape-round', 'shape-square', 'shape-full');
    this.container.classList.add(`shape-${this.shape}`);

    this.container.querySelectorAll('[data-action^="shape-"]').forEach(btn => {
      btn.classList.remove('active');
    });
    this.container.querySelector(`[data-action="shape-${this.shape}"]`)?.classList.add('active');

    this.updateSize();
  }

  updateMirror() {
    if (!this.videoElement) return;

    if (this.mirrored) {
      this.videoElement.style.transform = 'scaleX(-1)';
      this.container.querySelector('[data-action="mirror"]').classList.add('active');
    } else {
      this.videoElement.style.transform = 'scaleX(1)';
      this.container.querySelector('[data-action="mirror"]').classList.remove('active');
    }
  }

  async togglePictureInPicture() {
    if (!this.videoElement || !document.pictureInPictureEnabled) return;

    try {
      if (document.pictureInPictureElement === this.videoElement) {
        await document.exitPictureInPicture();
      } else {
        await this.videoElement.requestPictureInPicture();
      }
    } catch (err) {
      
    }
  }

  async close() {
    if (this.videoElement && document.pictureInPictureElement === this.videoElement) {
      try {
        await document.exitPictureInPicture();
      } catch (err) {
        
      }
    }

    this.stopCamera();

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.videoElement = null;

    if (this.onClose) {
      this.onClose();
    }
  }

  async show(deviceId) {
    if (this.container) {
      this.close();
    }

    this.createPreviewWindow();
    await this.startCamera(deviceId);
  }
  }

  window.CameraPreview = CameraPreview;
  
  
  let cameraPreviewInstance = null;

  window.addEventListener('message', (event) => {
    if (event.data.type === 'CAP_CAMERA_PREVIEW_COMMAND') {
      const { cameraId } = event.data;
      

      if (!cameraId) {
        
        if (cameraPreviewInstance) {
          cameraPreviewInstance.close();
          cameraPreviewInstance = null;
        }
        return;
      }

      try {
        if (!cameraPreviewInstance) {
          
          cameraPreviewInstance = new CameraPreview({
            onClose: () => {
              
              cameraPreviewInstance = null;
              window.postMessage({ type: 'CAP_CAMERA_PREVIEW_CLOSED' }, '*');
            }
          });
        }

        
        cameraPreviewInstance.show(cameraId).then(() => {
          
        }).catch(err => {
          
          window.postMessage({ 
            type: 'CAP_CAMERA_PREVIEW_ERROR', 
            error: err.message 
          }, '*');
        });
      } catch (err) {
        
        window.postMessage({ 
          type: 'CAP_CAMERA_PREVIEW_ERROR', 
          error: err.message 
        }, '*');
      }
    }
  });
  
  window.dispatchEvent(new CustomEvent('cap-camera-preview-ready'));
})();
