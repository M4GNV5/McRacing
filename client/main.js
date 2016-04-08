var ws = new WebSocket("ws://" + document.domain + ":6060");
var wheelEl = document.getElementById("wheel");
var gasBtn = document.getElementById("gas");
var breakBtn = document.getElementById("break");

function handleError(e)
{
	alert("" + e);
}

ws.onopen = function()
{
	start();
}
ws.onmessage = function(ev)
{
	//ignore
}
ws.onclose = ws.onerror = function(err)
{
	handleError("disconnected from server");
}

function start()
{
	var nick = localStorage.mcnick = prompt("Enter your ingame name", localStorage.mcnick);
	
	function sendAccCb(val)
	{
		return function(ev)
		{
			ws.send(JSON.stringify({cmd: "acceleration", acc: val}));
		};
	}
	
	if('ontouchstart' in window)
	{
		gasBtn.addEventListener("touchstart", sendAccCb(1));
		gasBtn.addEventListener("touchend", sendAccCb(0));
		breakBtn.addEventListener("touchstart", sendAccCb(-1));
		breakBtn.addEventListener("touchend", sendAccCb(0));
	}
	else
	{
		gasBtn.addEventListener("mousedown", sendAccCb(1));
		gasBtn.addEventListener("mouseup", sendAccCb(0));
		breakBtn.addEventListener("mousedown", sendAccCb(-1));
		breakBtn.addEventListener("mouseup", sendAccCb(0));
	}

	FULLTILT.getDeviceOrientation()
		.then(function(data)
		{
			ws.send(JSON.stringify({cmd: "nick", nick: nick}));
			
			var last;
			requestAnimationFrame(loop);
			
			function loop()
			{
				if(ws.readyState != WebSocket.OPEN)
					return;
					
				var beta = data.getFixedFrameEuler().beta;
				if(last == beta)
				{
					requestAnimationFrame(loop);
					return;
				}
				last = beta;
				
				var deg = -Math.round(beta);
				wheel.style.transform = "rotate(" + deg + "deg)";
				wheel.style["-webkit-transform"] = "rotate(" + deg + "deg);";
				
				var tilt = beta / 50;
				ws.send(JSON.stringify({cmd: "wheel", tilt: tilt}));
				requestAnimationFrame(loop);
			}
		})
		.catch(function(err)
		{
			handleError(err);
		});
}
