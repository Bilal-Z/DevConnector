const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

ProjectSchema = new Schema({
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'user'
	},
	members: [
		{
			_id: false,
			dev: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			role: {
				type: String,
				required: true
			},
			vacancy: {
				type: Boolean,
				default: true
			}
		}
	],
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	status: {
		type: String,
		default: 'HIRING'
	},
	// applicants for a job role
	applicants: [
		{
			_id: false,
			dev: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			role: {
				type: String,
				required: true
			}
		}
	],
	// devs who were offered jobs
	offered: [
		{
			_id: false,
			dev: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			role: {
				type: String,
				required: true
			}
		}
	],
	tasks: [
		{
			dev: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			title: {
				type: String,
				required: true
			},
			description: {
				type: String,
				required: true
			},
			note: {
				type: String
			},
			status: {
				type: String,
				default: 'TODO'
			}
		}
	],
	posts: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			title: {
				type: String,
				required: true
			},
			text: {
				type: String,
				required: true
			},
			comments: [
				{
					user: {
						type: Schema.Types.ObjectId,
						ref: 'user'
					},
					text: {
						type: String,
						required: true
					},
					date: {
						type: Date,
						default: Date.now
					}
				}
			],
			date: {
				type: Date,
				default: Date.now
			}
		}
	]
});

ProjectSchema.plugin(mongoosePaginate);
module.exports = Project = mongoose.model('project', ProjectSchema);
