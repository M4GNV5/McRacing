var net = require("net");

module.exports = Rcon;

function Rcon(ip, port)
{
    var self = this;
    self.nextId = 0;
    self.connected = false;
    self.authed = false;
    self.packages = [];

    self.socket = net.connect(port, ip, function()
    {
        self.connected = true;
    });
    self.socket.on("data", function(data)
    {
        var length = data.readInt32LE(0);
        var id = data.readInt32LE(4);
        var type = data.readInt32LE(8);
        var response = data.toString("ascii", 12, data.length - 2);

        if(self.packages[id])
        {
            self.packages[id](type, response);
        }
        else
        {
            console.log("unexpected rcon response", id, type, response);
        }
    });
}
Rcon.timeout = 5000;

Rcon.prototype.close = function()
{
    this.socket.end();
}

Rcon.prototype.auth = function(pw, cb)
{
    var self = this;

    if(self.authed)
        throw new Error("already authed");

    if(self.connected)
        doAuth();
    else
        self.socket.on("connect", doAuth);

    function doAuth()
    {
        self.sendPackage(3, pw, cb);
    }
};

Rcon.prototype.command = function(cmd, cb)
{
    this.sendPackage(2, cmd, cb);
};

Rcon.prototype.sendPackage = function(type, payload, cb)
{
    var self = this;
    var id = self.nextId;
    self.nextId++;

    if(!self.connected)
        throw new Error("Cannot send package while not connected");

    var length = 14 + payload.length;
    var buff = new Buffer(length);
    buff.writeInt32LE(length - 4, 0);
    buff.writeInt32LE(id, 4);
    buff.writeInt32LE(type, 8);

    buff.write(payload, 12);
    buff.writeInt8(0, length - 2);
    buff.writeInt8(0, length - 1);

    self.socket.write(buff);

    var timeout = setTimeout(function()
    {
        delete self.packages[id];
        cb("Server sent no request in " + Rcon.timeout / 1000 + " seconds");
    }, Rcon.timeout);

    self.packages[id] = function(type, response)
    {
        clearTimeout(timeout);
        var err = type >= 0 ? false : "Server sent package code " + type;
        cb(err, response, type);
    }
}