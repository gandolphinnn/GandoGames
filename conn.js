//? middleware
class Conn {
	constructor(wsAddr, errorCB, loginForm) {
		this.conn = new WebSocket(wsAddr);
		this.status; //? -1 failed, 0 disconnected, 1 connected
		//* server never found
			this.conn.onerror = () => {
				errorCB('Errore, server non trovato, aggiorna la pagina.');
				this.status = -1;
			};
		//* opened connection
			this.conn.onopen = () => {
				this.status = 1;
				console.log('connected');
				setInterval(() => { //? connection handling
					if (this.conn.readyState > 1 && this.status == 1) { //? disconnected
						errorCB('Errore, server disconnesso, attendi.');
						this.status = 0;
						console.log('disconnected');
					}
					if (this.conn.readyState > 1 && this.status == 0) { //? try to reconnect
						this.conn = new WebSocket(wsAddr);
					}
					if (this.conn.readyState == 1 && this.status == 0) { //? managed to reconnect
						document.getElementById('overlay').style.display = 'none';
						this.status = 1;
						console.log('reconnected');
					}
				}, 1000);
			}		
		//* msg from server
			this.conn.onmessage = (input) => {
				let msg = JSON.parse(input.data);
				console.log(msg);
				switch (msg.type) {
					case 'login':
						if (msg.result == 'session') {
							this.un = msg.un;
						}
						else if (msg.result == 'accepted'){
							window.location.replace('');
						}
						else {
							loginForm(msg.result);
						}
						break;
					case '':  break;
					default: console.log('Invalid message type'); break;
				}
			};
	}
	send(json) {
		this.conn.send(JSON.stringify(json))
	}
}