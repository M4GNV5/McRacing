var WebSocketServer = require("ws").Server;
var Rcon = require("./rcon.js");
var config = require("./config.json");

var wss = new WebSocketServer({port: 6060});
wss.on("connection", function(socket)
{
	var rcon;
	var nick;
	var lastUpdate;
	
	var controlWheel = 0;
	var acceleration = 0;
	var speed = 0;
	var rotation = config.startRotation;
	var pos = config.startPos;
	
	function loop()
	{
		if(!rcon)
			return;
		
		var now = Date.now();
		var dTime = (now - lastUpdate) / 1000;
		lastUpdate = now;
		
		rotation += dTime * controlWheel * config.maxTurning;
		rotation = Math.round(rotation * 10000) / 10000;
		if(rotation < -180)
			rotation += 360;
		if(rotation > 180)
			rotation -= 360;
		
		speed += dTime * acceleration * config.acceleration;
		if(speed > 0)
			speed -= 0.01 + dTime * config.speedLoss * speed;
		speed = Math.max(Math.min(speed, config.maxSpeed), config.minSpeed);
		
		pos[0] -= Math.sin(rotation * Math.PI / 180) * speed * dTime;
		pos[2] += Math.cos(rotation * Math.PI / 180) * speed * dTime;
		
		rcon.command("tp " + nick + " " + pos.join(" ") + " " + rotation + " ~", function(err, resp)
		{
			loop();
		});
	}
	
	socket.on("message", function(msg)
	{		
		var data = JSON.parse(msg);
		if(data.cmd != "wheel")
			console.dir(data);
		
		if(data.cmd == "nick")
		{
			nick = data.nick.trim();
			rcon = new Rcon(config.rcon_ip, config.rcon_port);
			rcon.auth(config.rcon_pw, function(err)
			{
				if(err)
					throw err;
					
				lastUpdate = Date.now();
				loop();
			});
		}
		else if(data.cmd == "wheel")
		{
			controlWheel = Math.max(Math.min(data.tilt, 1), -1);
		}
		else if(data.cmd == "acceleration")
		{
			acceleration = Math.max(Math.min(data.acc, 1), -1);
		}
	});
	socket.on("close", function()
	{
		if(rcon)
		{
			rcon.close();
			rcon = null;
		}
	});
});