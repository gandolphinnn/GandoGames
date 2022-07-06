window.onload = ()=>{
    let showConnError = (errorMsg)=>{
        document.getElementById("overlay").style.display = "flex";
        document.getElementById("errorMsg").innerText = errorMsg;
    };
    //* connection setup
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if (!window.WebSocket) {
        showConnError("Il tuo browser non supporta le WebSocket, impossibile procedere.");
        return;
    }
    //* connection start
    let me = new Conn("ws://192.168.1.199:1330", showConnError);
    //* msg from server
    me.conn.onmessage = (input)=>{
        let msg = JSON.parse(input.data);
        console.log(msg);
    };
};

//# sourceMappingURL=index.1aaed7c2.js.map
