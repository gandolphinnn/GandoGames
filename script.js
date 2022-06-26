window.onload = () => {
	//* connection setup
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	if (!window.WebSocket) {
		chatbody.innerHTML = '<p>Your browser doesn\'t support WebSockets.</p>';
		return;
	}

//* my data
	let me = new WebSocket('ws://192.168.1.199:1330');

//* connection start
	me.onopen = () => {
		me.send(JSON.stringify({type: 'handshake'}));
		setInterval(() => {
			if (me.readyState !== 1) {
				console.log('Errore');
			}
		}, 500);
	};

//* msg from server
	me.onmessage = (input) => {
		let msg = JSON.parse(input.data);
		console.log(msg);
	};

	me.onerror = function () {
		console.log('Connection error: server not found, refresh the page');
	};
}