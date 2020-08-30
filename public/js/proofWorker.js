const pow = require('proof-of-work');
const Buffer = require('buffer').Buffer;

const genPrefix = (poem, paragraph) => Buffer.from([...poem, paragraph].join(''), 'hex');

const solver = new pow.Solver();

onmessage = ({ data }) => {
    const { paragraph, poem } = data;
    const prefix = genPrefix(poem, paragraph);

    const nonce = solver.solve(20, prefix);

    postMessage(nonce);
};
