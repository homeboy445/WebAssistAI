const fs = require('fs');
const archiver = require('archiver');

// Path to the output zip file
const outputFilePath = 'release/webAssistAI.zip';

// Create a file to stream archive data to
const output = fs.createWriteStream(outputFilePath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', () => {
    console.log(`Archive has been finalized and the output file descriptor has closed. ${archive.pointer()} total bytes`);
});

// Handle errors
archive.on('error', err => {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append files from a directory
archive.directory('dist/', false);

// Append individual files
// archive.file('file1.txt', { name: 'file1.txt' });
// archive.file('file2.txt', { name: 'file2.txt' });

// Finalize the archive (finish the stream)
archive.finalize();
