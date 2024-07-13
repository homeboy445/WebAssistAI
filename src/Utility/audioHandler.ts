import { io } from "socket.io-client";
import { getBaseURL } from "../consts/Urls";
import axios from "axios";

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

class AudioHandler {
  
  public readonly DEFAULT_AUDIO_TIMEOUT = 10000;

  private mediaRecorder!: MediaRecorder;
  private audioBlobUrl = "";
  private recorderPromise: Promise<Blob> = Promise.resolve(new Blob());
  private autoStopTimer!: NodeJS.Timeout;
  public clearRecordingCompletionTimer: () => void = () => {};

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
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      throw new Error("already recording!");
    }
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
    try {
      this.mediaRecorder.stop();
      const blobData = await this.recorderPromise;
      return {
        sendToServer: async () => {
          return new Promise((resolve) => {
            try {
            const reader = new FileReader();
            reader.readAsArrayBuffer(blobData);
            reader.onloadend = async () => {
                debugger;
                const arrayBuffer = reader.result;
                const data = await axios.post(`${getBaseURL()}/transcribe`, arrayBuffer, {
                  headers: {
                    "Content-Type": "application/octet-stream",
                  },
                }).then((response) => {
                  console.log("transcription response received!");
                  if (response.status > 300) {
                    throw new Error("error while sending audio to server");
                  }
                  return response.data;
                }).catch(e => {
                  console.log("error while sending audio to server: ", e);
                  return { transcribedData: null };
                });
                if (!data.transcribedData) {
                  resolve("error");
                } else {
                  resolve(data.transcribedData);
                }
            };
            } catch (e) {
              resolve("error");
            }
          });
        },
      };
    } catch (e) {
      return {
        sendToServer: async () => "error"
      }
    }
  }

  async awaitCompletionAndTranscribe(timer?: number) {
    this.clearRecordingCompletionTimer();
    return new Promise((resolve) => {
      const processRecording = async () => {
        const options = await this.stop();
        options.sendToServer()
        .then(response => resolve(response))
        .catch(e => resolve(e));
      }
      if (!timer) {
        processRecording();
      } else {
        const timeout = setTimeout(processRecording, timer);
        this.clearRecordingCompletionTimer = () => {
          clearTimeout(timeout);
          resolve(false);
        }
      }
    });
  }

  reset() {
    this.audioBlobUrl = "";
  }

  getAudioBlobUrl() {
    return this.audioBlobUrl;
  }
}

const audioHandler = new AudioHandler();
export { audioHandler };
