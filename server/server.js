//? single server page for all communication, don't include the "server" folder when shared
//* find the server's IP
	const cmd = require('child_process');
	let ipString = cmd.execSync('ipconfig | find /i "IPv4"').toString( );
	const server = {
		ip: /IPv4\./i.test( ipString )? ipString.match( /\.\s\.\s\.\s:\s([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/ )[1] : 'error',
		port: 1330,
		loc: ''
	};
	server.loc = server.ip + ':' + server.port;
	process.title = 'GandoGames server at '+ server.loc;
	const fs = require('fs');
//* start the server
	let webSocketServer = require('websocket').server;
	let httpserver = require('http').createServer(() => {});
	httpserver.listen(server.port, () => {console.log('Server ready on '+ server.loc)});
	let wsServer = new webSocketServer({httpServer: httpserver});

//* variables
	function searchUser(field, value) { //? return the user object specified
		return usersList.find(o => o[field] == value);
	}
	class User { //? rappresent an anctual user
		constructor (un, pw, points) { //? used when data is imported or when new user signs in
			this.conn; //? just the object to use for the communications
			this.addr; //? use this to keep track of the user's movements inside the session
			this.status = -1; //? -1 disconnected, 0 undefined, 1 connected
			this.un = un;
			this.pw = pw;
			this.points = points;
		}
		setConn(conn) { //? used when an imported user becomes active or a new user signs in
			clearTimeout(this.timer) //? to prevent all these below if the user just switched page
			this.conn = conn;
			this.addr = this.conn.remoteAddress;
			this.status = 1;
			this.conn.on('close', () => {
				this.status = 0;
				this.timer = setTimeout(() => {
					console.log('User '+ this.un +' disconnected');
					this.status = -1;
				}, 30000);
			});
		}
		send(json) {
			this.conn.send(JSON.stringify(json));
		}
	}
//* read users data from db
	let usersList = new Array;
	fs.readFile('users.json', 'utf-8', (err, data) => {
		let dataList = JSON.parse(data.toString() + ']');
		console.log('Users list:');
		console.log(dataList);
		dataList.forEach(u => {	
			usersList.push(new User(u.un, u.pw, u.points));
		});
	});

//* new connection
	wsServer.on('request', (request) => {
		//* connection setup
			let newConn = request.accept(null, request.origin);
			let user = searchUser('addr', newConn.remoteAddress);
			if (user != undefined && user.status != -1) {
				user.setConn(newConn);
				loggedUser(user);
			}
			else {
				newConn.send(JSON.stringify({type: 'login', result: ''}));
				newConn.on('message', (msg) => {
					if (msg.type !== 'utf8')
					return;
					msg = JSON.parse(msg.utf8Data);
					console.log('Message: ' + JSON.stringify(msg));
					let u;
					switch (msg.type) {
						case 'login':
							u = searchUser('un', msg.un);
							if (u == undefined) {
								newConn.send(JSON.stringify({type: 'login', result: 'un'}));
							}
							else if (u.pw != msg.pw) {
								newConn.send(JSON.stringify({type: 'login', result: 'pw'}));
							}
							else if (u.status != -1) {
								newConn.send(JSON.stringify({type: 'login', result: 'status'}));
							}
							else {
								newConn.send(JSON.stringify({type: 'login', result: 'accepted'}));
								u.setConn(newConn);
								console.log('User '+ u.un +' is connected from ' + u.addr);
								loggedUser(u);
							}
							break;
						case 'signin':
							u = searchUser('un', msg.un);
							if (u != undefined) {
								newConn.send(JSON.stringify({type: 'login', result: 'un'}));
							}
							else {
								newConn.send(JSON.stringify({type: 'login', result: 'accepted'}));
								u = new User(msg.un, msg.pw, 0);
								u.setConn(newConn);
								const data = ','+ JSON.stringify({un: u.un, pw: u.pw, points: 0});
								fs.appendFile('users.json', data, (err) => {
									console.log('New user '+ u.un +' is connected from ' + u.addr);
									usersList.push(u);
									loggedUser(u);
								});
							}
							break;
					};
				});
			};		
	});

//* logged user handler
	function loggedUser(user) {
		user.send({type: 'login', result: 'session', un: user.un})
		user.conn.on('message', (msg) => {
			if (msg.type !== 'utf8') //? accept only text
				return;
			msg = JSON.parse(msg.utf8Data);
			console.log('Message: ' + JSON.stringify(msg));
			switch (msg.type) {
				case 'logout':
					user.addr = null;
					user.status = -1; //todo handle logout properly, dont close connection, just unset user data!!!!
					console.log(user);
					break;
				case 'playerAction': //? a player has done an action
					//todo: calculate the new game state and send it to all users
					break;
				case 'gameInfo': //? required game info by user
					//todo: decide if this is useful in any way
					break;
				default: console.log('Invalid message type'); break;
			}
		});
	}