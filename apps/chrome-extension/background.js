const API_BASE_URL = 'https://cap.so';

let recordingState = {
  isRecording: false,
  isPaused: false,
  mediaRecorder: null,
  recordedChunks: [],
  videoId: null,
  uploadId: null,
  startTime: null,
  config: null
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cap extension installed');
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'start-recording') {
    toggleRecording();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(message.config).then(sendResponse);
      return true;
    
    case 'STOP_RECORDING':
      handleStopRecording().then(sendResponse);
      return true;
    
    case 'PAUSE_RECORDING':
      handlePauseRecording().then(sendResponse);
      return true;
    
    case 'GET_RECORDING_STATE':
      sendResponse({ isRecording: recordingState.isRecording });
      return true;
  }
});

async function toggleRecording() {
  if (recordingState.isRecording) {
    await handleStopRecording();
  } else {
    const config = await getDefaultConfig();
    await handleStartRecording(config);
  }
}

async function getDefaultConfig() {
  const stored = await chrome.storage.local.get(['recordingConfig']);
  return stored.recordingConfig || {
    mode: 'screen',
    micEnabled: true,
    cameraEnabled: false
  };
}

async function handleStartRecording(config) {
  if (recordingState.isRecording) {
    return { success: false, error: 'Already recording' };
  }

  try {
    const auth = await chrome.storage.local.get(['user']);
    if (!auth.user) {
      throw new Error('Not authenticated');
    }

    recordingState.config = config;

    const streamId = await getStreamId(config.mode);
    if (!streamId) {
      throw new Error('Failed to get stream');
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording screen/camera'
    });

    const response = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_START_RECORDING',
      streamId,
      config
    });

    if (response.success) {
      recordingState.isRecording = true;
      recordingState.startTime = Date.now();
      
      const videoData = await createVideoOnServer(config);
      recordingState.videoId = videoData.id;
      
      notifyRecordingStarted();
      
      return { success: true };
    } else {
      throw new Error(response.error || 'Failed to start recording');
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    return { success: false, error: error.message };
  }
}

async function handleStopRecording() {
  if (!recordingState.isRecording) {
    return { success: false, error: 'Not recording' };
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_STOP_RECORDING'
    });

    if (response.success) {
      recordingState.isRecording = false;
      recordingState.isPaused = false;
      
      notifyRecordingStopped();
      
      await uploadRecording(response.blob);
      
      await chrome.offscreen.closeDocument();
      
      return { success: true };
    } else {
      throw new Error(response.error || 'Failed to stop recording');
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return { success: false, error: error.message };
  }
}

async function handlePauseRecording() {
  if (!recordingState.isRecording) {
    return { success: false, error: 'Not recording' };
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_PAUSE_RECORDING'
    });

    if (response.success) {
      recordingState.isPaused = !recordingState.isPaused;
      return { success: true, isPaused: recordingState.isPaused };
    } else {
      throw new Error(response.error || 'Failed to pause recording');
    }
  } catch (error) {
    console.error('Failed to pause recording:', error);
    return { success: false, error: error.message };
  }
}

async function getStreamId(mode) {
  try {
    let sources;
    
    if (mode === 'fullscreen' || mode === 'screen') {
      sources = ['screen', 'window'];
    } else if (mode === 'window') {
      sources = ['window'];
    } else if (mode === 'tab') {
      sources = ['tab'];
    } else if (mode === 'camera') {
      return 'camera';
    } else {
      sources = ['screen', 'window', 'tab'];
    }

    const streamId = await new Promise((resolve, reject) => {
      chrome.desktopCapture.chooseDesktopMedia(
        sources,
        (streamId) => {
          if (!streamId) {
            reject(new Error('User cancelled screen selection'));
          } else {
            resolve(streamId);
          }
        }
      );
    });

    return streamId;
  } catch (error) {
    console.error('Failed to get stream ID:', error);
    return null;
  }
}

async function createVideoOnServer(config) {
  const response = await fetch(`${API_BASE_URL}/api/desktop/video/create`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to create video on server');
  }

  return await response.json();
}

async function uploadRecording(blob) {
  if (!recordingState.videoId) {
    throw new Error('Missing video ID');
  }

  try {
    notifyUploadProgress(0, 'Preparing upload...');

    const uploadId = await initiateMultipartUpload(
      recordingState.videoId
    );

    const chunkSize = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(blob.size / chunkSize);
    const parts = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, blob.size);
      const chunk = blob.slice(start, end);

      const partNumber = i + 1;
      const presignedUrl = await getPresignedUrl(
        recordingState.videoId,
        uploadId,
        partNumber
      );

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'video/mp4'
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      const etag = uploadResponse.headers.get('ETag');
      parts.push({
        partNumber,
        etag: etag.replace(/"/g, ''),
        size: chunk.size
      });

      const progress = ((i + 1) / totalChunks) * 100;
      notifyUploadProgress(progress, 'Uploading...');
    }

    await completeMultipartUpload(
      recordingState.videoId,
      uploadId,
      parts
    );

    notifyUploadProgress(100, 'Upload complete!');

    const shareUrl = `${API_BASE_URL}/s/${recordingState.videoId}`;
    chrome.tabs.create({ url: shareUrl });

  } catch (error) {
    console.error('Upload failed:', error);
    notifyUploadProgress(0, 'Upload failed');
    throw error;
  }
}

async function initiateMultipartUpload(videoId) {
  const response = await fetch(`${API_BASE_URL}/api/upload/multipart/initiate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoId,
      contentType: 'video/mp4'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to initiate multipart upload');
  }

  const data = await response.json();
  return data.uploadId;
}

async function getPresignedUrl(videoId, uploadId, partNumber) {
  const response = await fetch(`${API_BASE_URL}/api/upload/multipart/presign-part`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoId,
      uploadId,
      partNumber
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const data = await response.json();
  return data.presignedUrl;
}

async function completeMultipartUpload(videoId, uploadId, parts) {
  const response = await fetch(`${API_BASE_URL}/api/upload/multipart/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoId,
      uploadId,
      parts
    })
  });

  if (!response.ok) {
    throw new Error('Failed to complete multipart upload');
  }

  return await response.json();
}

function notifyRecordingStarted() {
  chrome.runtime.sendMessage({ type: 'RECORDING_STARTED' });
}

function notifyRecordingStopped() {
  chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' });
}

function notifyUploadProgress(progress, status) {
  chrome.runtime.sendMessage({
    type: 'UPLOAD_PROGRESS',
    progress,
    status
  });
}
