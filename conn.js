class Conn {
	constructor(wsAddr, errorCB) {
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
				this.login();
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
	}
	login() {
		let userID = new URLSearchParams(window.location.search).get('user');
		if (userID == '' || userID == null) { //? unlogged
			document.getElementById('main-page').innerHTML = `<fieldset id="form">
								<legend>ACCEDI</legend>
								<label for="un">Username</label>
								<input type="text" id="un">
								<label for="pw">Password</label>
								<input type="password" id="pw">
								<label for="sign">
									<input type="checkbox" id="sign">Primo accesso
								</label>
								<button id="confirm">Conferma</button>
							</fieldset>`;
			document.getElementById('confirm').addEventListener('click', () => {
				let form = {
					type: document.getElementById('sign').checked? 'signin' : 'login',
					un: document.getElementById('un').value,
					pw: document.getElementById('pw').value
				}
				if (form.un != '' && form.pw != '') {
					this.send(form);
				}
			});
		}
		else {
			this.send({type: 'login', id: userID});
		}
	}
	send(json) {
		this.conn.send(JSON.stringify(json))
	}
}