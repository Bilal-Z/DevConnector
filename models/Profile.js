const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'user'
	},
	website: {
		type: String
	},
	location: {
		type: String
	},
	// employment status
	status: {
		type: String,
		default: 'UNEMPLOYED'
	},
	offers: [
		{
			proj: {
				type: Schema.Types.ObjectId,
				ref: 'project'
			},
			role: {
				type: String,
				required: true
			}
		}
	],
	// currently enrolled job
	currentJob: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'project'
	},
	// list of skills
	skills: {
		type: [String],
		required: true
	},
	bio: {
		type: String
	},
	githubusername: {
		type: String
	},
	// list of all projects participated in
	projects: [
		{
			id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'project'
			},
			title: {
				type: String,
				required: true
			},
			role: {
				type: String,
				required: true
			},
			description: {
				type: String
			}
		}
	],
	education: [
		{
			school: {
				type: String,
				required: true
			},
			degree: {
				type: String,
				required: true
			},
			fieldofstudy: {
				type: String,
				required: true
			},
			from: {
				type: Date,
				required: true
			},
			to: {
				type: Date
			},
			current: {
				type: Boolean,
				default: false
			},
			description: {
				type: String
			}
		}
	],
	social: {
		youtube: {
			type: String
		},
		twitter: {
			type: String
		},
		facebook: {
			type: String
		},
		linkedin: {
			type: String
		},
		instagram: {
			type: String
		}
	},
	date: {
		type: Date,
		default: Date.now
	}
});

module.exports = Profile = mongoose.model('profile', ProfileSchema);