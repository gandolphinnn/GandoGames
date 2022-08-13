//? js presenter
window.onload = () => {
	let showConnError = (errorMsg) => {
		document.getElementById('overlay').style.display = 'flex';
		document.getElementById('errorMsg').innerText = errorMsg;
	}
	
//* connection setup
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	if (!window.WebSocket) {
		showConnError('Il tuo browser non supporta le WebSocket, impossibile procedere.');
		return;
	}
	
//* frontend
	function sendForm() {
		let form = {
			type: document.getElementById('sign').checked? 'signin' : 'login',
			un: document.getElementById('un').value,
			pw: document.getElementById('pw').value
		}
		if (form.un != '' && form.pw != '') {
			me.send(form);
		}
	}
	function loginForm(error) {
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
		document.addEventListener('keydown', (e) => {
			if (e.code == 'Enter')
				sendForm();
		})
		document.getElementById('confirm').addEventListener('click', () => {
			sendForm();
		});
	}
	
	//* logout
		document.getElementById('logout').addEventListener('click', () => {
			if(confirm('Sei sicuro di voler effettuare il logout?'))
			{
				me.send({type: 'logout'})
				window.location.href = "";
			}
		});
	
//* connection start
	let me = new Conn(
		'ws://192.168.1.199:1330',
		showConnError,
		loginForm
	);
}