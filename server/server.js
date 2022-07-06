//? single server page for all communication, don't include the "server" folder when shared
//* find the server's IP and start it
	const cmd = require( 'child_process' );
	let ipString = cmd.execSync('ipconfig | find /i "IPv4"').toString( );
	const server = {ip: null, port: 1330, loc: null};
	server.ip = /IPv4\./i.test( ipString )? ipString.match( /\.\s\.\s\.\s:\s([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/ )[1] : 'error';
	server.loc = server.ip +':'+ server.port;
	process.title = 'chatGL server '+ server.loc;
	let webSocketServer = require('websocket').server;
	let http = require('http');
	let httpserver = http.createServer(() => {});
	httpserver.listen(server.port, () => {console.log('Server ready on '+ server.loc)});
	let wsServer = new webSocketServer({httpServer: httpserver});

//* variables
	function newID() {
		return 
	}
	class Client {
		constructor (conn) {
			this.conn = conn;
			this.addr = this.conn.remoteAddress;
			this.un;
			this.pw; //? once un and pw are set they must not change;
			this.id; //? use this only to track user between pages without login again
			this.status = 1; //? 0 inactive, 1 active
			//todo prevent all these below when the user switch page 
			console.log('New connection accepted from ' + this.addr);
			//* user offline
			this.conn.on('close', () => {
				console.log('User '+ this.addr +' disconnected');
				this.status = 0;
				this.id = 0;
			});
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
			clientsList.push(client);

		//* msg from client
			client.conn.on('message', (msg) => {
				if (msg.type !== 'utf8') //? accept only text
					return;
				msg = JSON.parse(msg.utf8Data);
				console.log(msg);
				switch (msg.type) {
					case 'login':
						if (msg.id) {
							//
						}
						else if (msg.un) {
							//
						}
						break;
					case 'signin':
						break;
					case 'player_action': //? a player has done an action
						break;
					case 'update': //? required game update by user
						break;
					default: console.log('Invalid message type'); break;
				}
			});

	});