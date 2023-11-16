/* const hexCode = '0123456789ABCDEF';

function parseHexBinary(s) {
    const len = s.length;
    if (len % 2 !== 0) {
        throw new Error(`hexBinary needs to be even-length: ${s}`);
    } else {
        const out = new Uint8Array(len / 2);

        for (let i = 0; i < len; i += 2) {
            const h = hexToBin(s.charAt(i));
            const l = hexToBin(s.charAt(i + 1));
            if (h === -1 || l === -1) {
                throw new Error(`contains illegal character for hexBinary: ${s}`);
            }

            out[i / 2] = h * 16 + l;
        }

        return out;
    }
}

function hexToBin(ch) {
    if ('0' <= ch && ch <= '9') {
        return ch.charCodeAt(0) - 48;
    } else if ('A' <= ch && ch <= 'F') {
        return ch.charCodeAt(0) - 65 + 10;
    } else {
        return 'a' <= ch && ch <= 'f' ? ch.charCodeAt(0) - 97 + 10 : -1;
    }
}

function printHexBinary(data) {
    const r = [];
    for (const b of data) {
        r.push(hexCode[(b >> 4) & 15]);
        r.push(hexCode[b & 15]);
    }
    return r.join('');
}

module.exports = {parseHexBinary, printHexBinary};
 */
