const Discord = require("discord.js");
const fs = require("fs");

const config = require("./config.json");
const pkg = require("./package.json");

function timeStamp() {
    d = new Date();
    s = d.getFullYear() + "/" + (d.getMonth()+1) + "/" + d.getDate();
    s += " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    return s;
}

function parse_msg(content) {
    // parse message content, remove @Alfred, split string into argv array
    var msg_quotes = content.replace("<@"+config.id+">", "").split('"');
    var msg = [];
    var msg_i;
    var i;
    for (i=0; i<msg_quotes.length; ++i) {
        msg_i = msg_quotes[i].trim();
        if (i % 2 == 0) {
            msg_i = msg_i.split(/\s+/);
        }
        msg = msg.concat(msg_i);
    }

    // remove empty strings from msg array
    var remove = [];
    for (i=0; i<msg.length; ++i) {
        if (msg[i].length < 1) {
            remove.push(i);
        }
    }
    for (i=remove.length-1; i>=0; --i) {
        msg.splice(remove[i], 1);
    }

    return msg;
}

function respond(msg, data) {
    var response = "";
    if (msg.length == 0) {
        return "Master Wayne, you haven't asked me to do anything.";
    }

    if (msg[0] === config.set_cmd && msg.length > 2) {
        if (msg[1] === config.all_keys) {
            return "I can't just change everything, Master Wayne.";
        }
        if (msg[1] in data) {
            response = "I have changed the item '" + msg[1] + "'";
            response += " from '" + data[msg[1]] + "' to '" + msg[2] + "'.";
        } else {
            response = "I have created the item '" + msg[1] + "'";
            response += " and set its value to '" + msg[2] + "'.";
        }
        data[msg[1]] = msg[2];
        save_data(data);
    } else if (msg[0] === config.get_cmd && msg.length > 1) {
        if (msg[1] === config.all_keys) {
            response = "```\n";
            for (var i in data) {
                response += i + "," + data[i] + "\n";
            }
            response += "```";
        } else if (msg[1] in data) {
            response = "I found that '" + msg[1] + "' was '" + data[msg[1]] + "'.";
        } else {
            response = "There's no such thing as " + msg[1] + " Master Wayne.";
        }
    } else if (msg[0] === config.del_cmd && msg.length > 1) {
        if (msg[1] === config.all_keys) {
            response = "I'll make sure to clean out every last bit Master Wayne:```\n";
            remove = [];
            for (var i in data) {
                response += i + "," + data[i] + "\n";
                remove.push(i);
            }
            response += "```";
            for (var i in remove) {
                delete data[remove[i]];
            }
            save_data(data);
        } else if (msg[1] in data) {
            response = "I got rid of '" +msg[1]+ "' which was '" + data[msg[1]] + "'.";
            delete data[msg[1]];
            save_data(data);
        } else {
            response = "There's no such thing as " + msg[1] + " Master Wayne.";
        }
    } else {
        response = "I'm sorry Master Wayne but I don't understand '" + msg + "'.\n";
        response += "Please ask me to " + config.get_cmd + ", " + config.set_cmd;
        response += ", or " + config.del_cmd + " something.";
    }

    return response;
}

function save_data(data) {
    var f = fs.openSync(config.datafile, "w");
    var s = "{\n";
    var end = "    ";
    for (var i in data) {
        s += end + '"' + i + '": "' + data[i] + '"';
        end = ",\n    ";
    }
    s += "\n}\n";
    fs.writeSync(f, s);
    fs.closeSync(f);
}

function main() {
    console.log("starting " + pkg.name + " v" + pkg.version + ":");
    console.log("add alfred to your server: " + config.bot_link);
    const alfred = new Discord.Client();

    // get saved data
    console.log("loading keys and values from " + config.datafile + ":");
    var data = {};
    if (fs.existsSync(config.datafile)) {
        data = require("./" + config.datafile);
    }
    console.log(data);
    console.log("\n")
    save_data(data);

    // when alfred initialized
    alfred.once("ready", () => {
        console.log("alfred is ready");
    });

    // when alfred receives message
    alfred.on("message", message => {
        mentions = message.mentions.members;
        if (mentions.has(config.id)) {
            console.log(timeStamp() + ": " + message.content);
            msg = parse_msg(message.content);
            response = respond(msg, data);
            message.channel.send(response);
            console.log("    alfred: " + response);
        }
    });

    // when alfred receives an edited message
    alfred.on("messageUpdate", (oldMessage, newMessage) => {
        mentions = newMessage.mentions.members;
        if (mentions.has(config.id)) {
            console.log(timeStamp() + ": " + newMessage.content);
            msg = parse_msg(newMessage.content);
            response = "Stop bloody changing your mind all the time!\n";
            response += respond(msg, data);
            newMessage.channel.send(response);
            console.log("    alfred: " + response);
        }
    });

    // log alfred into discord
    alfred.login(config.token);
}

main();
