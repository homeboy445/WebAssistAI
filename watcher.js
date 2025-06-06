const fs = require('fs');
const { exec } = require('child_process');

// Get the folder path from command line arguments (argv)
const folderToWatch = process.argv[2];

if (!folderToWatch) {
  console.error('Please provide the folder path as a command line argument.');
  process.exit(1);
}

class FileWatcher {
  constructor(folderPath, commandToRun) {
    this.folderPath = folderPath;
    this.isCommandRunnerLocked = false;
    this.commandToRun = commandToRun;
    this.listenerAttached = {};
  }

  listFiles(folderPath) {
    return fs.readdirSync(folderPath);
  }

  attachListener(filePath) {
    if (this.listenerAttached[filePath]) {
      return;
    }
    this.listenerAttached[filePath] = true;
    fs.watch(filePath, (eventType, filename) => {
      if (eventType === 'change') {
        if (this.isCommandRunnerLocked) {
          // console.log("skipping duplicate commands!");
          return;
        }
        this.isCommandRunnerLocked = true;
        if (filename.includes("dist/")) {
            return;
        }
        console.log(`\nFile '${filename}' has changed. Running '${this.commandToRun}' command...`);
        // Run the 'npm run build:dev' command programmatically
        exec(this.commandToRun, { cwd: this.folderPath }, (error, stdout, stderr) => {
          // setTimeout(() => {
            this.isCommandRunnerLocked = false;
          // }, 2000);
          if (error) {
            console.error(`\nError running '${this.commandToRun}' command: ${error.message}`);
            return;
          }
          if (stderr) {
            console.error(`\n'${this.commandToRun}' command had errors: ${stderr}`);
            return;
          }
          console.log(`\n'${this.commandToRun}' command output:\n${stdout}`);
        });
      }
    });
  }

  isDirectory(path) {
    return fs.statSync(path).isDirectory();
  }

  listen(path = this.folderPath) {
    if (path.includes("dist") || path.includes("node_modules") || path.includes('watcher.js')) {
        return;
    }
    if (path == this.folderPath) {
      console.log("Watching for any changes in any of the files in this directory: ", this.folderPath);
    }
    if (this.isDirectory(path)) {
      this.listFiles(path).forEach((subPath) => {
        this.listen(`${path}/${subPath}`);
      });
    } else {
      this.attachListener(path);
    }
  }
}

const watcher = new FileWatcher(folderToWatch, "npm run build:dev");
watcher.listen();
