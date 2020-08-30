const buffer = require('buffer').Buffer;
const express = require('express');
const http = require('http');
const fs = require('fs');
const nodeCleanup = require('node-cleanup');
const pow = require('proof-of-work');

/*
- force rhymes (maybe?)
- limit newline amount
- add about link
*/
const POEM_LOCATION = 'poem.json';
const MAX_PARAGRAPH_LENGTH = 200;

const loadPoem = () => {
    try {
        const contents = fs.readFileSync(POEM_LOCATION);
        const poem = JSON.parse(contents);
        
        return poem;
    } catch {
        return [];
    }
}

const savePoem = poem => {
    fs.writeFileSync(POEM_LOCATION, JSON.stringify(poem));
};

const genPrefix = (poem, paragraph) => buffer.from([...poem, paragraph].join(''), 'hex');

const isProofValid = (poem, paragraph, unbufferedProof) => {
    const proof = Buffer.from(unbufferedProof);
    const prefix = genPrefix(poem, paragraph);

    const verifier = new pow.Verifier({
        size: 1024,
        n: 16,
        complexity: 20,
        prefix
    });

    return verifier.check(proof);
};

const isParagraphValid = (paragraph, proof) => {
    const validProof = isProofValid(poem, paragraph, proof);

    const validText = 0 < paragraph.length && paragraph.length < MAX_PARAGRAPH_LENGTH;

    return validText && validProof;
};

const constructPoemEntry = paragraph => ({
    paragraph,
    time: Date.now()
});

const poem = loadPoem();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.get('/poem', (req, res) => {
    res.send(poem);
});

io.on('connect', socket => {
    socket.on('propose_paragraph', ({ paragraph, proof }) => {
        const valid = isParagraphValid(paragraph, proof);
        if (valid) {
            const poemEntry = constructPoemEntry(paragraph);

            poem.push(poemEntry);
            io.sockets.emit('poem_updated', poem);
        } else {
            console.warn('Paragraph with invalid proof submitted');
        }
    });

    socket.emit('poem_updated', poem);
});


server.listen(5000);

nodeCleanup(() => {
    savePoem(poem);
});
