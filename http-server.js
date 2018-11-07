const fs = require("fs");
const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const net = require('net');

const client = new net.Socket();
const portTcp = 8124;

const clientStartStr = 'QA';
const serverAcceptStr = 'ACK';
const serverDeclineStr = 'DEC';
const addWorker = 'AW';
const removeWorker = 'RW';
const getWorkers = 'GW';
let isTcpSereverWork = false

const { Subject } = require('await-notify');
const event = new Subject();

let result = null;

client.setEncoding('utf8');

client.connect(portTcp, function () {
    console.log('Connected');
    client.write(clientStartStr);
});

client.on('data', function (data) {
    if (data === serverDeclineStr) {
        client.destroy();
    }
    else if (data === serverAcceptStr) {
        //client.write(GetRandomDuration());
        isTcpSereverWork = true;
    }
    else {
        result = data;
        event.notify();
    }
});

client.on('close', function () {
    console.log('Connection closed');
});


const handlers = {
    '/workers': getAllWorkers,
    '/workers/add': addClient,
    '/workers/remove': removeClient
};

function sendInstruction(instruction, param) {
    const instr = {
        'instruction': instruction,
        'param': param
    }
    client.write(JSON.stringify(instr));
   
}

async function addClient(req, res, payload, cb) {
    sendInstruction(addWorker, payload.duration);
    await event.wait();
    cb(null, result, 'application/json');
}

async function removeClient(req, res, payload, cb) {
    sendInstruction(removeWorker, payload.id);
    await event.wait();
    cb(null, result, 'application/json');
}

async function getAllWorkers(req, res, payload, cb) {
    client.write(getWorkers);
    await event.wait();
    cb(null, result, 'application/json');
}

const server = http.createServer((req, res) => {
    parseBodyJson(req, (err, payload) => {
        if (!isTcpSereverWork) return;
        const handler = getHandler(req.url);

        handler(req, res, payload, (err, result, header) => {
            if (err) {
                res.statusCode = err.code;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(err));
                return;
            }

            res.statusCode = 200;
            if (header) {
                res.setHeader('Content-Type', header);
                if (header === 'application/json') {
                    res.end(JSON.stringify(result));
                }
                else
                    res.end(result);
            }
        });
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function getHandler(url) {
    return handlers[url] || notFound;
}

function notFound(req, res, payload, cb) {
    cb({ code: 404, message: 'Not found' });
}

function parseBodyJson(req, cb) {
    let body = [];

    req.on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
        body = Buffer.concat(body).toString();
        let params;
        if (body) {
            params = JSON.parse(body);
        }
        cb(null, params);
    });
}