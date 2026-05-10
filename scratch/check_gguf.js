const fs = require('fs');

async function checkGGUF(path) {
    const fd = fs.openSync(path, 'r');
    const buffer = Buffer.alloc(1024); // First KB is enough for metadata start
    fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    const magic = buffer.toString('utf8', 0, 4);
    if (magic !== 'GGUF') {
        console.log('Not a GGUF file');
        return;
    }

    const version = buffer.readUInt32LE(4);
    console.log('GGUF Version:', version);

    // Look for architecture string
    const content = buffer.toString('utf8');
    const archMatch = content.match(/general\.architecture/);
    if (archMatch) {
        console.log('Found general.architecture at', archMatch.index);
        console.log('Surrounding text:', content.slice(archMatch.index, archMatch.index + 50));
    } else {
        console.log('Architecture not found in first KB');
    }
}

checkGGUF('d:\\exotic-matter\\models\\gemma-4-it.gguf');
