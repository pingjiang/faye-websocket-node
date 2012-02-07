var WebSocket = require('../lib/faye/websocket'),
    fs        = require('fs'),
    http      = require('http'),
    https     = require('https');

var port   = process.argv[2] || 7000,
    secure = process.argv[3] === 'ssl';

var upgradeHandler = function(request, socket, head) {
  var ws = new WebSocket(request, socket, head, ['irc', 'xmpp']);
  console.log('open', ws.url, ws.version, ws.protocol);
  
  ws.onopen = function() {
    ws.send('The server says hi.');
  };
  
  ws.onmessage = function(event) {
    ws.send(event.data);
  };
  
  ws.onclose = function(event) {
    console.log('close', event.code, event.reason);
    ws = null;
  };
};

var requestHandler = function(request, response) {
  if (!WebSocket.EventSource.isEventSource(request))
    return staticHandler(request, response);
  
  var es   = new WebSocket.EventSource(request, response),
      time = parseInt(es.lastEventId, 10) || 0;
  
  console.log('open', es.url, es.lastEventId);
  
  var loop = setInterval(function() {
    time += 1;
    es.send('Time: ' + time);
    setTimeout(function() {
      if (es) es.send('Update!!', {event: 'update', id: time});
    }, 1000);
  }, 2000);
  
  es.send('Welcome!\n\nThis is an EventSource server.');
  
  es.onclose = function() {
    clearInterval(loop);
    console.log('close', es.url);
    es = null;
  };
};

var staticHandler = function(request, response) {
  var path = request.url;
  
  fs.readFile(__dirname + path, function(err, content) {
    var status = err ? 404 : 200;
    response.writeHead(status, {'Content-Type': 'text/html'});
    response.write(content || 'Not found');
    response.end();
  });
};

var server = secure
           ? https.createServer({
               key:  fs.readFileSync(__dirname + '/../spec/server.key'),
               cert: fs.readFileSync(__dirname + '/../spec/server.crt')
             })
           : http.createServer();

server.addListener('request', requestHandler);
server.addListener('upgrade', upgradeHandler);
server.listen(port);

