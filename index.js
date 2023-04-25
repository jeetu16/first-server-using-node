const http = require('http');
const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs');
const EventEmitter = require('events');
const logEvents = require('./logEvents.js');


class Emitter extends EventEmitter {  }

const myEmitter = new Emitter();
myEmitter.on('log',(message,filename) => logEvents(message,filename));

const PORT = process.env.PORT || 3400;

const serveFile = async (response, contentType, filePath) => {
    try {
        const rawData = await fsPromises.readFile(filePath, !contentType.includes('image') ? 'utf8' : "");
        response.writeHead(
            filePath.includes('404.html') ? 404 : 200,
            { 'Content-type': contentType });
        response.end(rawData);
    } catch (err) {
        console.log(err.message);
        myEmitter.emit('log',`${err.name}\t${err.message}`,'errLog.txt');
        response.statusCode = 500;
        response.end();
    }
}
const server = http.createServer((req, res) => {
    console.log(req.url, req.method);
    myEmitter.emit('log',`${req.url}\t${req.method}`,'reqLog.txt');

    const extension = path.extname(req.url);
    let contentType;
    switch (extension) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        default:
            contentType = 'text/html';
    }
    let filePath =
        contentType === 'text/html' && req.url === '/'
            ? path.join(__dirname, 'pages', 'index.html')
            : contentType === 'text/html' && req.url.slice(-1) === '/'
                ? path.join(__dirname, 'pages', req.url, 'index.html')
                : contentType === 'text/html'
                    ? path.join(__dirname, 'pages', req.url)
                    : path.join(__dirname, req.url)

    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
        serveFile(res, contentType, filePath);
    } else {
        switch (path.parse(filePath).base) {
            case 'old-page.html':
                res.writeHead(301, { 'Location': '/new-page.html' });
                res.end();
                break;
            case 'www-page.html':
                res.writeHead(301, { 'Location': '/' })
                res.end();
                break;
            default:
                serveFile(res, 'text/html',path.join(__dirname, 'pages', '404.html'));
        }
    }

})

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));