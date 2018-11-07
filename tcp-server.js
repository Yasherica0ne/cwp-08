const net = require('net');
const fs = require('fs');
const port = 8124;

const clientStartStr = 'QA';
const serverAcceptStr = 'ACK';
const serverDeclineStr = 'DEC';
const addWorker = 'AW';
const removeWorker = 'RW';
const getWorkers = 'GW';
let seed = 0;
let workers = [];

function getAllWorkers() {
    const allWorkers = [];
    for (let worker of workers) {
        const data = require(worker.file);
        allWorkers.push({
            'id': worker.id,
            'startedOn': worker.date,
            'numbers': data
        });
    }
    return allWorkers;
}

function getDate() {
    const current = new Date();
    const date = (current.getDay() + 1) + '.' + (current.getMonth() + 1) + '.' + current.getFullYear();
    return date;
}

function generateId(){
    return Date.now() + seed++;
}

const server = net.createServer((client) => {
    client.id = generateId();
    console.log('Client connected id: ' + client.id + '\r\n');
    let isStartingConnection = true;
    client.setEncoding('utf8');
    const childProcess = require('child_process').exec;

    client.on('data', (data) => {
        if (isStartingConnection) {
            if (data === clientStartStr) {
                client.write(serverAcceptStr);
                isStartingConnection = false;
            }
            else {
                client.write(serverDeclineStr);
                client.write('close');
            }
        }
        else if (data === getWorkers) {
            const result = getAllWorkers();
            client.write(JSON.stringify(result));
        }
        else {
            const instr = JSON.parse(data);
            if (instr.instruction === addWorker) {
                const date = getDate();
                const id = generateId();
                const filePath = `./Files/${id}.json`
                const worker = childProcess(`node worker.js ${filePath} ${instr.param}`, (err, sout, serr) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                });
                workers.push({
                    'id': id,
                    'worker': worker,
                    'file': filePath,
                    'date': date
                })
                const result = {
                    'id': id,
                    'startedOn': date
                }
                const jsonResult = JSON.stringify(result);
                client.write(jsonResult);
            }
            else if (instr.instruction === removeWorker) {
                const workerObject = workers.find(worker => worker.id == instr.param)
                const data = require(workerObject.file);
                workerObject.worker.kill();
                const result = {
                    'id': client.id,
                    'startedOn': workerObject.date,
                    'numbers': data
                }
                workers = workers.filter(worker => worker.id == instr.param);
                const jsonResult = JSON.stringify(result);
                client.write(jsonResult);
            }
        }
    });

    client.on('end', () => console.log(`Client id: ${client.id} disconnected\r\n`));

});

server.listen(port, () => {
    console.log(`Server listening on localhost: ${port}\r\n`);
});