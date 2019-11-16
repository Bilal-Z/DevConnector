const mongoose = require('mongoose');
const Schema = mongoose.Schema;

ProjectSchema = new Schema({
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'user'
	},
	members: [
		{
			dev: {
				type: Schema.Types.ObjectId,
				ref: 'user'
			},
			Role: {
				type: String,
				required: true
			},
			vacancy: {
				type: Boolean,
				default: true
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
			discription: {
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
				ref: 'users'
			},
			text: {
				type: String,
				required: true
			},
			name: {
				type: String
			},
			avatar: {
				type: String
			},
			likes: [
				{
					user: {
						type: Schema.Types.ObjectId,
						ref: 'users'
					}
				}
			],
			comments: [
				{
					user: {
						type: Schema.Types.ObjectId,
						ref: 'users'
					},
					text: {
						type: String,
						required: true
					},
					name: {
						type: String
					},
					avatar: {
						type: String
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

module.exports = Project = mongoose.model('project', ProjectSchema);
