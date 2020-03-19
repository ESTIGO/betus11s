let inv;
const express = require('express')
const bodyParser = require('body-parser');
const fs = require('fs');

const Discord = require('discord.js');
const client = new Discord.Client({ disableEveryone: true });
const config = require('./config.json');
const keyv = require('keyv');
const colordb = new keyv('sqlite://./db/colors.sqlite');
const prefixdb = new keyv('sqlite://./db/prefixes.sqlite');
const roledb = new keyv('sqlite://./db/roles.sqlite')
const devs = ['501710994293129216', '580358240014172181'];
client.commands = new Discord.Collection();
const cds = new Discord.Collection();
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./cmds/${file}`);
	client.commands.set(command.name, command);
};

client.on('ready', async() => {
  console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity(`${client.users.size} users in ${client.guilds.size} servers!`, { type: 'WATCHING' })
	inv = await client.generateInvite(8);
	console.log(inv);
});

client.on('message', async message => {
	let inviteRegex = new RegExp('(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]');
	let invtest = await inviteRegex.test(message.content)
	if (invtest == true) {
		if (message.member.roles.has('689843399720697909')) {
			message.delete();
			return;
		};
		message.member.send(`You were kicked from ${message.guild.name} because of "posting invites" you can rejoin whenever`)
		message.delete();
		message.member.kick(`Posting an invite in the server. The invite was ${message.content}`)
		message.channel.send(`${message.author.tag} (${message.author.id}) has been kicked for "posting invite links" they may rejoin whenever.`)
	}
	var expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
	var linkRegex = new RegExp(expression);
	let res = await linkRegex.test(message.content); 
	if (res == true) {
		if (message.member.roles.has('689843399720697909')) {
			return message.delete();
		};
		message.channel.send(`${message.author.tag} (${message.author.id}) has been kicked for "posting links" they may rejoin whenever.`)
		message.author.send(`${message.author.tag} (${message.author.id}) has been kicked for "posting links" they may rejoin whenever.`)		
		message.member.kick('posting links')
		return;
	}

	let prefix;
	prefix = await prefixdb.get('prefix' + message.guild.id);
	console.log(prefix);
	if (!prefix) {
		prefix = config.prefix;
		console.log(`prefix changed to default -> ${prefix}`)
	}
	if (message.author.bot) return;
	if(!message.content.startsWith(prefix)) return;
	color = await colordb.get(message.author.id)
	if (!color) color = config.hexColor;
	const ServerclientGuild = client.guilds.get('689760593824972827')
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const cmd = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	if (!cmd && message.channel.type != 'dm' && message.member.roles.has('690151802477346868')) {
		let [arg] = args;
		if (!arg) {
			return message.channel.send("", {
				embed: new Discord.RichEmbed()
				.setColor(color)
				.setDescription(`${message.author.tag} has ${message.content.slice(prefix.length).split(/ +/).shift()}ed in chat`)
			});
		};
		let target;
		let usr;
		let diffUSER;
		let ext = args.slice(1).join(' ')
		if (!ext) ext = '';
		usr = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
		try {
			const uu = await client.fetchUser(usr.user.id).catch(() => client.fetchUser(args[0]));
	  	// use user
		t = `${uu.username}#${uu.discriminator}`;
		if (commandName == "give" && t) {
		return message.channel.send({
				embed: new Discord.RichEmbed()
				.setDescription(`${t} has received ${ext}`)
				.setColor(color)
			});			
		};
		if (commandName == "take" && t) {
		return message.channel.send({
				embed: new Discord.RichEmbed()
				.setDescription(`${t} has lost ${ext}`)
				.setColor(color)
			});			
		};
		return message.channel.send({
				embed: new Discord.RichEmbed()
				.setDescription(`${message.author.tag} has ${message.content.slice(prefix.length).split(/ +/).shift()}ed ${t} ${ext}`)
				.setColor(color)
			});
		} catch(e) {
  		return message.channel.send({
				embed: new Discord.RichEmbed()
				.setColor(color)
				.setDescription(`${message.author.tag} has ${message.content.slice(prefix.length).split(/ +/).shift()}ed ${args[0]} ${ext}`)
			})
		}
	};

	if (!cds.has(cmd.name)) {
		cds.set(cmd.name, new Discord.Collection());
	};

	const now = Date.now();
	const timestamps = cds.get(cmd.name);
	let cooldownAmount = 5000;
	if (ServerclientGuild.member(message.author).roles.has('690146058042343484')) {
		cooldownAmount = 0
	};
	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.channel.send(`You must wait another ${timeLeft.toFixed(1)} seconds before using the ${cmd.name} command again!`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	if (cmd.guildOnly && message.channel.type !== 'text') {
		return message.reply(`That command doesn't work in DMs!`);
	};

	if (cmd.devOnly && !devs.includes(message.author.id)) {
		return message.channel.send(`You're not allowed to use this command!`)
	}

	try {
		cmd.run(client, message, args, prefixdb, colordb, roledb,prefix, color)
	} catch (e) {
		message.reply('Sorry, there was an error: ' + e)
		console.error(e);
	};
});

client.login(BOT_TOKEN);