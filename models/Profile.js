const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
	// offers from project
	offers: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'project'
			},
			role: {
				type: String,
				required: true
			}
		}
	],
	// places applied to
	applied: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
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
		ref: 'project',
		default: null
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
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'project'
			},
			role: {
				type: String,
				required: true
			}
		}
	],
	experience: [
		{
			title: {
				type: String,
				required: true
			},
			company: {
				type: String,
				required: true
			},
			location: {
				type: String
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

ProfileSchema.plugin(mongoosePaginate);
module.exports = Profile = mongoose.model('profile', ProfileSchema);
