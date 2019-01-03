const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const YouTube = require('simple-youtube-api');

const client = new Discord.Client({disableEveryone: true});
const youtube = new YouTube('AIzaSyCYec0lLA5nFravq4w5Y8Udk91rH-TpGH0');

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on("ready", function() {
	client.user.setActivity('over the server | !!help', { type: 'WATCHING' });
	console.log("Computer Science Bot is Ready!");
});

client.on('disconnect', () => console.log('I disconnected, reconnecting...'));

client.on('reconnecting', () => console.log('Reconnecting...'));

client.on('message', async msg => {
	if (msg.author.bot) return undefined;
	if (msg.channel.id == '494085792772128768' && msg.attachments.size == 0 && !msg.content.startsWith('https://youtu') && !msg.content.startsWith('https://cdn.discordapp.com/attachments/') && !msg.content.startsWith('http://i.4cdn.org/gif/') && !msg.content.startsWith('https://steamuserimages-a.akamaihd.net/')) {
		console.log(msg.content);
		msg.delete();
	}
	if (!msg.content.startsWith('!!')) return undefined;
	let args = msg.content.split(' ');
	let command = args[0].toLowerCase();
	args = args.slice(1);
	const serverQueue = queue.get(msg.guild.id);
	console.log(command);

	if (command === "!!play" || command === "!!p") {
		msg.delete();
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send("You need to be in a voice channel");
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I am not allowed to connect');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I am not allowed to speak');
		}

		try {
			var video = await youtube.getVideo(args);
		}
		catch (error) {
			try {
				var videos = await youtube.searchVideos(args, 1);
				var video = await youtube.getVideoByID(videos[0].id);
			}
			catch (err) {
				msg.channel.send('I could not obtain any search results.');
			}
		}

		const song = {
			id: video.id,
			title: video.title,
			url: `https://www.youtube.com/watch?v=${video.id}`
		};

		if (!serverQueue) {
			const queueConstruct = {
				textChannel: msg.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 2,
				playing: true,
				repeat: "off"
			};
			queue.set(msg.guild.id, queueConstruct);

			queueConstruct.songs.push(song);
			msg.channel.send(`Started playing: **${song.title}**`);

			try {
				var connection = await voiceChannel.join();
				queueConstruct.connection = connection;
				play(msg.guild, queueConstruct.songs[0]);
			}
			catch (error) {
				console.error(`I could not join the voice channel because ${error}`);
				queue.delete(msg.guild.id);
				return msg.channel.send(`I could not join the voice channel because ${error}`);
			}
		}
		else {
			serverQueue.songs.push(song);
			return msg.channel.send(`**${song.title}** has been added to the queue.`);
		}

		return undefined;
	}
	else if (command === "!!skip" || command === "!!s") {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel');
		if (!serverQueue) return msg.channel.send('There is nothing playing to skip.');
		if (!args[0]) {
			serverQueue.connection.dispatcher.end();
		}
		else {
			let num = args[0];
			num--;
			if (num < 0 || num > serverQueue.songs.length - 1) return msg.channel.send('Invalid argument');
			serverQueue.songs.splice(num, 1);
		}
		return msg.channel.send('Skipped the song');
	}
	else if (command === "!!setnext") {
		if (!args[0]) return msg.channel.send(`Specify a number in the queue to move to the front.`);
		let num = args[0];
		num--;
		if (num < 0 || num > serverQueue.songs.length - 1) return msg.channel.send('Invalid argument');
		let toMove = serverQueue.songs[num];
		serverQueue.songs.splice(num);
		serverQueue.songs.splice(1, 0, toMove);
		return msg.channel.send('Moved song  to the front of the queue.');
	}
	else if (command === "!!stop") {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel');
		if (!serverQueue) return msg.channel.send('There is nothing playing to stop.');
		serverQueue.songs = []
		serverQueue.connection.dispatcher.end();
		return msg.channel.send('Stopped the queue');
	}
	else if (command === "!!volume" || command === "!!vol") {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[0]) return msg.channel.send(`The current volume is **${serverQueue.volume}**`);
		if ((args[0] < 0.1 || args[0] > 10) && args[0] != 69420) return msg.channel.send('Invalid volume');
		serverQueue.volume = args[0];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 5);
		return msg.channel.send(`Volume set to **${args[0]}**`);
	}
	else if (command === "!!np" || command === "!!nowplaying") {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		return msg.channel.send(`Now playing: **${serverQueue.songs[0].title}**`);
	}
	else if (command === "!!queue" || command === "!!q") {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		let songqueue = "    **Queue**";
		for (let i = 0; i < serverQueue.songs.length; i++) {
			songqueue = songqueue + `\n **${i + 1}. ${serverQueue.songs[i].title}**`;
		}
		return msg.channel.send(songqueue);
	}
	else if (command === "!!repeat") {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[0]) return msg.channel.send(`The repeat status is **${serverQueue.repeat}**`);
		if (args[0] != "off" && args[0] != "single" && args[0] != "queue") return msg.channel.send('Invalid argument');
		serverQueue.repeat = args[0];
		return msg.channel.send(`Repeat status set to ${args[0]}`);
	}
	else if (command === "!!pause") {
		if (!serverQueue && !serverQueue.playing) return msg.channel.send('There is nothing playing.');
		serverQueue.playing = false;
		serverQueue.connection.dispatcher.pause();
		return msg.channel.send('Paused the music');
	}
	else if (command === "!!resume") {
		if (!serverQueue && !serverQueue.playing) return msg.channel.send('There is nothing playing.');
		serverQueue.playing = true;
		serverQueue.connection.dispatcher.resume();
		return msg.channel.send('Resumed the music');
	}
	else if (command === "!!shuffle") {
		if (!serverQueue) return msg.channel.send("There is nothing playing.");
		serverQueue.songs = shuffle(serverQueue.songs);
		msg.channel.send("Shuffled remaining items in the queue!");
	}
	else if (command === "!!help") {
		msg.channel.send("**Music Commands:       |      Prefix:  `!!`\n`Command:     Alias:     Usage:`\n\nAdd music to the queue or start streaming music to the voice channel:\n`play         p          !!play https://youtu.be/dQw4w9WgXcQ || !!play Never gonna give you up`\n\nSkip the current song:\n`skip         s          !!skip || !!s`\n\nStop the entire queue:\n`stop                    !!stop`\n\nDisplay or set the volume:\n`volume       vol        !!volume || !!volume [0.1-10]`\n\nDisplay song that is currrently playing:\n`nowplaying   np         !!nowplaying || !!np`\n\nDisplay the entire queue:\n`queue        q          !!queue || !q`\n\nPause current song:\n`pause                   !!pause`\n\nResume current song:\n`resume                  !!resume`\n\nDisplay or set repeat status:\n`repeat                  !!repeat || !!repeat [off, single, queue]`\n\nShuffle remaining songs in the queue:\n`shuffle                 !!shuffle`**")
	}
	else if (command === "!!say") {
    	let sayMessage = args.join(" ");
    	msg.delete(); 
   		msg.channel.send(sayMessage);
	}
	else if (command === "!!setactivity") {
		if (!args[0]) return msg.channel.send('Please add the type and the message');
		if (!args[1]) return msg.channel.send('Please also add a message');
		let type = args[0]
		args = args.slice(1);
		let activity = args.join(" ");
		
		switch (type) {
			case "watching":
				client.user.setActivity(activity, { type: 'WATCHING' });
				break;
			case "playing":
				client.user.setActivity(activity, { type: 'PLAYING' });
				break;
			case "listening":
				client.user.setActivity(activity, { type: 'LISTENING' });
				break;
			default:
				return msg.channel.send('watching, playing or listening');
		}
		return msg.channel.send(`Activity set to ${type} ${activity}`);
	}
	else if (command === "!!userinfo") {
		let embed = new Discord.RichEmbed();
		embed.setAuthor(msg.author.username, msg.author.avatarURL);
		embed.setDescription("This is the user's info!");
		embed.setColor("#00FF00");
		embed.addField("Full Username:", `${msg.author.username}#${msg.author.discriminator}`);
		embed.addField("ID:", msg.author.id);
		embed.addField("Account Created At:", msg.author.createdAt);
		embed.setTimestamp(new Date());
		embed.setFooter("© Computer Science Bot");
		msg.channel.send(embed);
	}
	else if (command === "!!weld") {
		msg.delete();
		return msg.channel.send("Weld");
	}
	return undefined;
});

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	
	const dispatcher = serverQueue.connection.playStream(ytdl(song.url, {filter: "audioonly"}))
		.on('end', () => {
			console.log('Song ended');
			if (serverQueue.repeat == "off") {
				serverQueue.songs.shift();
			}
			if (serverQueue.repeat == "queue") {
				serverQueue.songs.push(serverQueue.songs.shift());
			}
			play(guild, serverQueue.songs[0]);
		})
		.on ('error', error => {
			console.error(error);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

function shuffle(array) {
	currentSong = array[0];
	array = array.slice(1);
	var currentIndex = array.length, temporaryValue, randomIndex;
	while (0 != currentIndex) {
    	randomIndex = Math.floor(Math.random() * currentIndex);
    	currentIndex -= 1;

    	temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
    	array[randomIndex] = temporaryValue;
	}
	array.unshift(currentSong);
  	return array;
}

client.login('MzUyNDE4MTE3ODc3NzYwMDAy.Dw-Ecw.3BcPgvW4Rq2A8yNcpKhSlom9ycA');