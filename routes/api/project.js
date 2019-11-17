const express = require('express');
const request = require('request');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Project = require('../../models/Project');

// @route POST api/project
// @desc create a project
// @acces Private
router.post(
	'/',
	[
		auth,
		[
			check('title', 'title is required')
				.not()
				.isEmpty(),
			check('team', 'team roles are required')
				.not()
				.isEmpty(),
			check('description', 'description is required')
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const teamRoles = req.body.team.split(',').map(role => ({
			role: role.trim()
		}));

		const newProj = new Project({
			owner: req.user.id,
			title: req.body.title,
			description: req.body.description,
			members: teamRoles
		});

		try {
			let project = await Project.findOne({ owner: req.user.id });
			if (project) {
				return res.status(400).json({ msg: 'user already has project' });
			}
			project = await Project.findOne({
				members: { $elemMatch: { dev: req.user.id } }
			});
			if (project) {
				return res.status(400).json({ msg: 'user already part of a project' });
			}

			project = await newProj.save();
			await Profile.findOneAndUpdate(
				{ user: req.user.id },
				{ currentJob: project.id }
			);
			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;
