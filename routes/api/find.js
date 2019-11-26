const express = require('express');
const request = require('request');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Project = require('../../models/Project');

// @route GET api/find/user
// @desc find developers as project owner
// @acces Private
router.get('/user', auth, async (req, res) => {
	try {
		if (!req.query.role) {
			return res.status(400).json({ msg: 'no role provided' });
		}
		let page;
		if (!req.query.page) {
			page = 1;
		} else {
			page = req.query.page;
		}
		const ownerProfile = await Profile.findOne({ user: req.user.id });
		const project = await Project.findById(ownerProfile.currentJob);
		if (!project || project.owner != req.user.id) {
			return res.status(400).json({ msg: 'you are not a project owner' });
		}
		// check if role exists in project
		if (
			!project.members.find(
				position =>
					position.vacancy === true && position.role === req.query.role
			)
		) {
			return res.status(400).json({ msg: 'role does not exist in project' });
		}
		const profiles = await Profile.paginate(
			{ currentJob: null, skills: { $all: req.query.role } },
			{
				select: '_id',
				populate: {
					path: 'user',
					select: 'name avatar'
				},
				limit: 15,
				page: page
			}
		);
		res.json(profiles);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route GET api/find/project
// @desc find projects
// @acces Private

module.exports = router;
