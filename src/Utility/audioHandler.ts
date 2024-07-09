import { getBaseURL } from "../consts/Urls";

function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


export class AudioHandler {
  mediaRecorder!: MediaRecorder;
  audioBlobUrl = "";
  recorderPromise: Promise<Blob> = Promise.resolve(new Blob());
  autoStopTimer!: NodeJS.Timeout;

  private waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState !== "loading") {
        resolve(true);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          resolve(true);
        });
      }
    });
  }

  async record() {
    await this.waitForDOMReady();
    let resolver = (value: Blob) => {};
    this.recorderPromise = new Promise((resolve) => {
      resolver = resolve;
    });
    let audioChunks: Blob[] = [];
    const stream = await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((x) => x)
      .catch((e) => {
        console.log("error while recording audio: ", e);
        return e;
      });
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      audioChunks = [];

      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioBlobUrl = audioUrl;
      resolver(audioBlob);
    };

    this.mediaRecorder.onerror = () => {
      console.log("error occurred while recording audio!");
      resolver(new Blob());
    };

    this.mediaRecorder.start();
    this.autoStopTimer = setTimeout(() => {
      this.stop();
    }, 60000);
  }

  async stop() {
    clearTimeout(this.autoStopTimer);
    this.mediaRecorder.stop();
    const blobData = await this.recorderPromise;
    return {
      sendToServer: async () => {
        try {
          const response = await fetch(`${getBaseURL()}/transcribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ base64File: await blobToBase64(blobData) }) // Convert the data object to a JSON string
          });
          const data = await response.json();
          console.log("received the transcribed data: ", data);
        } catch (e) {}
      }
    }
  }

  reset() {
    this.audioBlobUrl = "";
  }

  getAudioBlobUrl() {
    return this.audioBlobUrl;
  }
}
