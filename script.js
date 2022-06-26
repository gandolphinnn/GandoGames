window.onload = () => {
	//* connection setup
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	if (!window.WebSocket) {
		chatbody.innerHTML = '<p>Your browser doesn\'t support WebSockets.</p>';
		return;
	}
	let output = document.querySelector('p');

//* my data
	let me = new WebSocket('ws://192.168.1.199:1330');

//* connection start
	me.onopen = () => {
		me.send(JSON.stringify({type: 'handshake'}));
		setInterval(() => {
			if (me.readyState !== 1) {
				output.innerText = 'Errore, server disconnesso';
			}
		}, 500);
	};

//* msg from server
	me.onmessage = (input) => {
		let msg = JSON.parse(input.data);
		output.innerText = msg.type;
	};

	me.onerror = function () {
		output.innerText = 'Errore, server non trovato';
	};
}