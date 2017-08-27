const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const leaderboardChannels = ['198658074876182538', '260546095082504202',
	'342822239076483074', '198658294007463936', '198658294007463936',
	'272921946352648192', '198658419945635840', '197818075796471808',
	'260546551255007232',
	'329477820076130306'];  // Dev server.

module.exports = (message, args, embed) => {
	if (message.guild) {
		db.collection('counts').aggregate()
			.match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}})
			.group({_id: '$_id.user', count: {$sum: '$count'}})
			.sort({count: -1})
			.limit(20)
			.toArray().then(users => {
			const embed = new Discord.RichEmbed()
				.setColor('RANDOM')
				.setTitle('Users with no lives:')
				.setDescription(users.map(user => `<@${user._id}>: \`${user.count} messages\``).join('\n'));
			message.channel.send({embed}).then(reply => app.addFooter(message, embed, reply)).catch(console.error);
		}).catch(console.error);
	}
};
