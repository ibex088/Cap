let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let audioStream = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OFFSCREEN_START_RECORDING':
      startRecording(message.streamId, message.config)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'OFFSCREEN_STOP_RECORDING':
      stopRecording()
        .then(blob => sendResponse({ success: true, blob }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    
    case 'OFFSCREEN_PAUSE_RECORDING':
      pauseRecording()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

async function startRecording(streamId, config) {
  try {
    recordedChunks = [];

    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    const tracks = [...stream.getVideoTracks()];

    if (config.micEnabled) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        tracks.push(...audioStream.getAudioTracks());
      } catch (error) {
        console.warn('Failed to get microphone:', error);
      }
    }

    const combinedStream = new MediaStream(tracks);

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ];

    let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    
    if (!selectedMimeType) {
      throw new Error('No supported MIME type found');
    }

    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
    };

    mediaRecorder.start(1000);

    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    cleanup();
    throw error;
  }
}

async function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('No active recording'));
      return;
    }

    mediaRecorder.onstop = async () => {
      try {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        const mp4Blob = await convertToMp4(blob);
        
        cleanup();
        resolve(mp4Blob);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    mediaRecorder.stop();
  });
}

async function pauseRecording() {
  if (!mediaRecorder) {
    throw new Error('No active recording');
  }

  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
  }

  return true;
}

async function convertToMp4(webmBlob) {
  return webmBlob;
}

function cleanup() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  
  mediaRecorder = null;
  recordedChunks = [];
}
