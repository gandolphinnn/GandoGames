//? single server page for all communication, don't include the "server" folder when shared
	const cmd = require( 'child_process' );
	let command = `ipconfig | find /i "IPv4"`;
	let ipString = cmd.execSync( command ).toString( );
	const server = {ip: null, port: null, loc: null};
	server.ip = /IPv4\./i.test( ipString )? ipString.match( /\.\s\.\s\.\s:\s([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/ )[1] : 'error';
	server.port = 1330;
	server.loc = server.ip +':'+ server.port;
	let webSocketServer = require('websocket').server;
	let http = require('http');
	let httpserver = http.createServer(() => {});
	httpserver.listen(server.port, () => {console.log('Server ready on '+ server.loc)});
	process.title = 'chatGL server '+ server.loc;
	let wsServer = new webSocketServer({httpServer: httpserver});

//* variables
	class Client {
		constructor (conn) {
			this.conn = conn;
		}
		send(json) {
			this.conn.send(JSON.stringify(json));
		}
	}
	let clientsList = new Array();

//* new connection
	wsServer.on('request', (request) => {
		//* connection setup
			let client = new Client(request.accept(null, request.origin));
			console.log('New connection accepted from ' + client.conn.remoteAddress);

		//* msg from client
			client.conn.on('message', (message) => {
				if (message.type !== 'utf8') //? accept only text
					return;
				let msg = JSON.parse(message.utf8Data);
				console.log(msg);
				client.send({type: 'Connessione riuscita'});
			});

		//* user offline
			client.conn.on('close', () => {
				console.log('User disconnected');
			});
	});