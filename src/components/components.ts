import $ from "jquery";
import { AITaskResponse, TaskType } from "../types/types";

const loader = (() => {
  const loaderParent = $(".main-loader-section");
  const loaderText = $("#loaderText");
  const loaderBar = $("#loader");
  const loaderTextList = [
    "AI is curating the content for you!🤗",
    "AI is learning from the data!🧐",
    "Thinking...🤔",
    "AI is working on it!🏃",
    "AI is heavy at work!🤖",
    "Understanding the page's data!📚",
  ];
  const updateText = (idx = 0) => {
    loaderText.html(loaderTextList[idx % loaderTextList.length]);
  };
  const handler = {
    run: (promiseToAwait: Promise<any>, timer = 100, staticMessage?: string) => {
      return new Promise((resolve) => {
        loaderParent.css({ display: "flex" });
        let width = 10;
        let textIdx = 0;
        let textChangingTimer: any;
        const func = () => {
          if (textChangingTimer === null) {
            return;
          }
          const timer = Math.round(Math.random() * 5000);
          textChangingTimer = setTimeout(func, timer);
          updateText(textIdx++);
        };
        if (staticMessage) {
            loaderText.html(staticMessage);
        } else {
            func();
        }
        const interval = setInterval(async () => {
          width = Math.min(100, width + Math.round(Math.random() * 10));
          if (width >= 100) {
            clearInterval(interval);
            resolve(await promiseToAwait);
            clearInterval(textChangingTimer);
            setTimeout(() => {
              handler.reset();
            }, 1000);
          }
          loaderBar.css({ width: `${width}%` });
        }, timer);
      });
    },
    reset: () => {
      loaderBar.css({ width: "0%" });
      loaderParent.css({ display: "none" });
    },
  };
  return handler;
})();

const AIResponseDialogBox = (() => {
  const dialogBox = $(".main-ai-response");
  const infoBox = $("#additionalInfo");
  const operationStatusSection = $("#operationStatus");
  $(".close-dialog-btn").on("click", () => {
    dialogBox.css({ display: "none" });
  });
  return {
    show({
      result,
      additionalInfo,
      operationSuccess,
      functionType,
    }: AITaskResponse) {
      let message = "AI's got nothing to say!😅";
      let operationMessage = "The operation was a failure!🥲";
      if (functionType === TaskType.DOM_OPERATION) {
        message = additionalInfo || message;
        operationMessage =
          "The requested DOM operation was a " +
          (operationSuccess ? "success🥳" : "failure🥲");
      } else if (functionType === TaskType.INFO_RETRIEVAL) {
        message = "The requested info is here!";
        // TODO: Use additionalInfo here as well!
        operationMessage =
          "The requested info retrieval operation was a " +
          (operationSuccess ? "success🥳" : "failure🥲");
      }
      if (result && typeof result === "object" && result.isError) {
        message = "Something went wrong! Please try again! 😞";
      }
      infoBox.html(message);
      operationStatusSection.html(operationMessage);
      dialogBox.css({ display: "flex" });
    },
  };
})();

const audioRecorderInterface = (() => {
    const recorderInterface = $(".main-recording-section");
    const recorderImg = $(".recorderImg");
    const closeCbList: Array<() => void> = [], cancelCbList: Array<() => void> = [];
    const timerInterface = (() => {
        let seconds = 0;
        const getTimeFormatted = () => {
            return `00:${seconds < 10 ? `0${seconds}` : seconds}`;
        }
        let interval: NodeJS.Timeout | null = null;
        const timerElement = $("#record-timer");
        return {
            start: () => {
                seconds = 0;
                function run() {
                    recorderImg.css({ opacity: seconds % 2 === 0 ? 0.5 : 1 });
                    timerElement.html(getTimeFormatted());
                    seconds++;
                };
                run();
                interval = setInterval(run, 1000);
            },
            stop: () => {
                recorderImg.css({ opacity: 1 });
                interval && clearInterval(interval);
                timerElement.html("processing...");
            }
        };
    })();
    const handler = {
        show: () => {
            timerInterface.start();
            recorderInterface.css({ display: "flex" });
        },
        onStop: (cb: () => void) => {
            closeCbList.push(cb);
        },
        onCancel: (cb: () => void) => {
            cancelCbList.push(cb);
        },
        logError: () => {
            recorderInterface.html("<H1>ERROR</H1>").css({ color: "red" });
        },
        hide: () => {
            timerInterface.stop();
            recorderInterface.css({ display: "none" });
        },
        haltTimer: () => {
            timerInterface.stop();
        }
    };
    $("#record-stop").on("click", () => {
        closeCbList.forEach(cb => {
            try { cb(); } catch (e) {}
        });
        timerInterface.stop();
        // handler.hide();
    });
    $("#record-cancel").css({ "pointer-events": "none", "opacity": "0.4" });
    // $("#record-cancel").on("click", () => {
    //     cancelCbList.forEach(cb => {
    //         try { cb(); } catch (e) {}
    //     });
    //     handler.hide();
    // });
    return handler;
})();

export { loader, AIResponseDialogBox, audioRecorderInterface };
