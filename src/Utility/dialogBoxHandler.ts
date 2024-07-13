import $ from "jquery";

export interface DialogBoxConfig {
  width: string | number;
  height: string | number;
}

export class DialogBoxHandler {
  target: JQuery<HTMLElement>;

  constructor(targetParent: HTMLElement = document.body) {
    this.target = $(targetParent || document.body);
  }

  private getDialogBox(store: { title: string; content: string }) {
    const parent = $(`<div></div>`);
    parent.css({ overflow: "scroll" });
    const mainDiv = $(`<div></div>`);
    const titleHolder = $(`<h1>${store.title}</h1>`);
    const contentHolder = $(`<p>${store.content}</p>`);
    const toggleButton = $(`<button>Close</button>`);
    toggleButton.addClass("closeBtn");
    titleHolder.css({
      "font-size": "2rem",
      "margin-top": "10%",
      "font-weight": "800",
    });
    contentHolder.css({
      "font-size": "1.3rem",
      "margin-top": "1%",
      "margin-bottom": "1%",
      "line-height": "inherit",
    });
    toggleButton.css({
      "font-size": "1rem",
      padding: "2%",
      cursor: "pointer",
      background: "green",
      color: "white",
      border: "none",
      "border-radius": "5px"
    });
    mainDiv.append(titleHolder);
    mainDiv.append(contentHolder);
    mainDiv.append(toggleButton);
    mainDiv.css({
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      position: "fixed",
      top: "0%",
      left: "50%",
      "z-index": "1000",
      background: "white",
      "overflow-x": "scroll",
      padding: "2%",
    });
    return {
      parent: mainDiv,
      child: {
        titleHolder,
        contentHolder,
        toggleButton,
      },
    };
  }

  spawn(
    data: { title: string; content: string; onAcceptCB?: () => void },
    config: DialogBoxConfig
  ) {
    const dialogBox = this.getDialogBox(data);
    dialogBox.parent.css({ width: config.width, height: config.height });
    this.target.append(dialogBox.parent);
    dialogBox.child.toggleButton.on("click", () => {
      try {
        data.onAcceptCB?.();
      } catch (e) {}
      dialogBox.parent.css({ left: "100%" });
    });
    return dialogBox;
  }
}
