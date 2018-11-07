function sleep(xSec) {
    return new Promise(resolve => setTimeout(resolve, xSec * 1000));
}

function getRandomNumber() {
    return Math.floor(Math.random() * 1000);
}

(async function work() {
    const [, , filePath, xSec] = process.argv;
    const file = [];
    while (true) {
        const number = getRandomNumber();
        file.push(number);
        const writeStream = require('fs').createWriteStream(filePath);
        writeStream.write(JSON.stringify(file));
        await sleep(parseInt(xSec));
    }
})();