const Discord = require("discord.js");
const fs = require("fs");

const config = require("./config.json");
const pkg = require("./package.json");

function time_stamp() {
    d = new Date();
    s = d.getFullYear() + "/" + (d.getMonth()+1) + "/" + d.getDate();
    s += " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    return s;
}

function data_file(srv) {
    return config.data_file.replace("%s", srv);
}

function parse_msg(content) {
    // remove @Alfred and split by quotes
    var msg_quotes = content.replace("<@"+config.id+">", "").split('"');

    // split msg into array by spaces, commas, or =
    var msg = [];
    var msg_i;
    var i;
    for (i=0; i<msg_quotes.length; ++i) {
        msg_i = msg_quotes[i].trim();
        if (i % 2 != 1) {
            msg_i = msg_i.split(/[\s=,]+/);
        }
        msg = msg.concat(msg_i);
    }

    // remove empty strings from msg array
    var remove = [];
    for (i=0; i<msg.length; ++i) {
        if (!(msg[i].length != 0)) {
            remove.push(i);
        }
    }
    for (i=remove.length-1; i>=0; --i) {
        msg.splice(remove[i], 1);
    }

    return msg;
}

function respond(msg, srv) {
    // load saved server data
    var file = data_file(srv);
    var data = load_data(file);

    // handle null message
    var response = "";
    if (!(msg.length != 1)) {
        return "Master Wayne, you haven't asked me to do anything.";
    }

    // handle set command
    if (msg[0] === config.set_cmd && msg.length > 2) {
        if (msg[1] === config.all_keys) {
            return "I can't just change everything, Master Wayne.";
        }
        if (msg[1] in data) {
            response = "I have changed the item `" + msg[1] + "`";
            response += " from `" + data[msg[1]] + "` to `" + msg[2] + "`.";
        } else {
            response = "I have created the item `" + msg[1] + "`";
            response += " and set its value to `" + msg[2] + "`.";
        }
        data[msg[1]] = msg[2];
        save_data(file, data);
    // handle get command
    } else if (msg[0] === config.get_cmd && msg.length > 1) {
        if (msg[1] === config.all_keys) {
            response = "```\n";
            for (var i in data) {
                response += i + "=" + data[i] + "\n";
            }
            response += "```";
        } else if (msg[1] in data) {
            response = "I found that `" + msg[1] + "` was `" + data[msg[1]] + "`.";
        } else {
            response = "There's no such thing as " + msg[1] + " Master Wayne.";
        }
    // handle delete command
    } else if (msg[0] === config.del_cmd && msg.length > 1) {
        if (msg[1] === config.all_keys) {
            response = "I'll make sure to clean out every last bit Master Wayne:```\n";
            remove = [];
            for (var i in data) {
                response += i + "=" + data[i] + "\n";
                remove.push(i);
            }
            response += "```";
            for (var i in remove) {
                delete data[remove[i]];
            }
            save_data(file, data);
        } else if (msg[1] in data) {
            response = "I got rid of `" + msg[1];
            response += "` which was `" + data[msg[1]] + "`.";
            delete data[msg[1]];
            save_data(file, data);
        } else {
            response = "There's no such thing as `" +msg[1]+ "` Master Wayne.";
        }
    // handle bad command
    } else {
        response = "I'm sorry Master Wayne but I don't understand `";
        response += msg.join(" ") + "`.\n";
        response += "Please ask me to " + config.get_cmd + ", ";
        response += config.set_cmd + ", or " + config.del_cmd + " something.";
    }

    return response;
}

function save_data(file, data) {
    var f = fs.openSync(file, "w");

    // build pretty json string
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

function load_data(file) {
    // default data values
    var default_data = {};
    default_data[config.rent_reminder_key] = "true";
    default_data[config.rent_paid_key] = "false";

    // read in saved data
    var data = {};
    if (fs.existsSync(file)) {
        data = require("./" + file);
    }

    // load in defaults if unset
    for (var key in default_data) {
        if (!data.hasOwnProperty(key)) {
            data[key] = default_data[key];
        }
    }

    return data;
}

function remind_rent(srv) {
    var date = (new Date()).getDate();
    var file = data_file(srv);
    if (date >= 28 || date <= 3) {
        var data = load_data(file);
        var remind_rent = (data[config.rent_reminder_key] === "true");
        var rent_paid = (data[config.rent_paid_key] === "true");
        if (remind_rent && !rent_paid) {
            return true;
        }
    } else {
        var data = load_data(file);
        data[config.rent_paid_key] = "false";
        save_data(file, data);
    }
    return false
}

function main() {
    // new client
    console.log("starting " + pkg.name + " v" + pkg.version + ":");
    console.log("add alfred to your server: " + config.bot_link);
    const alfred = new Discord.Client();

    // when alfred initialized
    alfred.once("ready", () => {
        console.log("alfred is ready");
        // remind rent timer
        var interval = alfred.setInterval(function() {
            console.log("checking rent:")
            for (var g of alfred.guilds) {
                var srv = g[0];
                var guild = g[1];
                if (remind_rent(srv)) {
                    var pref = 0;
                    var channel = null;
                    // choose a text channel with name "alfred" or "bots"
                    for (var c of guild.channels) {
                        var ch = c[1];
                        var name = ch.name.toLowerCase();
                        if (ch.type === "text") {
                            if (pref < 1) {
                                pref = 1;
                                channel = ch;
                            }
                            if (name.includes("general") && pref < 2) {
                                pref = 2;
                                channel = ch;
                            }
                            if (name.includes("bots") && pref < 3) {
                                pref = 3;
                                channel = ch;
                            }
                            if (name.includes("alfred") && pref < 4) {
                                pref = 4;
                                channel = ch;
                            }
                        }
                    }
                    console.log("remind rent " + guild.name + " (" + srv + ")");
                    // send random reminder message
                    var msg = [
                        "For goodness' sakes, pay your rent already Bruce!",
                        "I'm sorry to say, but the rent is due Master Wayne.",
                        "Rent's due again. Make sure to pay it this time.",
                        "Isn't it about time you paid your rent already?"
                    ][Math.floor(Math.random()*4)];
                    channel.send(msg);
                    console.log("#" + channel.name + "> " + msg);
                }
            }
        }, 6*60*60*1000); // 6 hours
    });

    // when alfred receives message
    alfred.on("message", message => {
        mentions = message.mentions.members;
        if (mentions.has(config.id)) {
            console.log(time_stamp() + ": " + message.content);
            msg = parse_msg(message.content);
            response = respond(msg, message.guild.id);
            message.channel.send(response);
            console.log("#" + message.channel.name + "> " + response);
        }
    });

    // when alfred receives an edited message
    alfred.on("messageUpdate", (oldMessage, newMessage) => {
        mentions = newMessage.mentions.members;
        if (mentions.has(config.id)) {
            console.log(time_stamp() + ": " + newMessage.content);
            msg = parse_msg(newMessage.content);
            response = "Stop bloody changing your mind all the time!\n";
            response += respond(msg, newMessage.guild.id);
            newMessage.channel.send(response);
            console.log("#" + newMessage.channel.name + "> " + response);
        }
    });

    // log alfred into discord
    alfred.login(config.token);
}

main();
