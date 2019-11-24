const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Project = require('../../models/Project');

// @route GET api/profile/me
// @desc get current users profile
// @acces Private
router.get('/me', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({
			user: req.user.id
		}).populate('user', ['name', 'avatar']);

		if (!profile) {
			return res.status(400).json({ msg: 'There is no profile for this user' });
		}

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('server error');
	}
});

// @route POST api/profile
// @desc create or update user profile
// @acces Private
router.post(
	'/',
	[
		auth,
		[
			check('skills', 'Skills is required')
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin
		} = req.body;

		// build profile object
		const profileFeilds = {};
		profileFeilds.user = req.user.id;
		if (website) profileFeilds.website = website;
		if (location) profileFeilds.location = location;
		if (bio) profileFeilds.bio = bio;
		if (status) profileFeilds.status = status;
		if (githubusername) profileFeilds.githubusername = githubusername;
		if (skills) {
			profileFeilds.skills = skills.split(',').map(skill => skill.trim());
		}

		// build social object
		profileFeilds.social = {};
		if (youtube) profileFeilds.social.youtube = youtube;
		if (twitter) profileFeilds.social.twitter = twitter;
		if (facebook) profileFeilds.social.facebook = facebook;
		if (linkedin) profileFeilds.social.linkedin = linkedin;
		if (instagram) profileFeilds.social.instagram = instagram;

		try {
			let profile = await Profile.findOne({ user: req.user.id });

			if (profile) {
				// update
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{ $set: profileFeilds },
					{ new: true }
				);

				return res.json(profile);
			}
			// create
			profile = new Profile(profileFeilds);

			await profile.save();
			res.json(profile);
		} catch (err) {
			console.error(err.message);
		}
	}
);

// @route GET api/profile
// @desc get all profiles
// @acces Public
router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		res.json(profiles);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('server error');
	}
});

// @route GET api/profile/user/:user_id
// @desc get profile by user id
// @acces Public
router.get('/user/:user_id', async (req, res) => {
	try {
		const profile = await Profile.findOne({
			user: req.params.user_id
		}).populate('user', ['name', 'avatar']);

		if (!profile) return res.status(400).json({ msg: 'profile fnot found' });

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		if (err.kind == 'ObjectId') {
			return res.status(400).json({ msg: 'profile not found' });
		}
		res.status(500).send('server error');
	}
});

// @route DELETE api/profile
// @desc delete profile, user & post
// @acces Private
router.delete('/', auth, async (req, res) => {
	try {
		// remove profile
		await Profile.findOneAndRemove({ user: req.user.id });
		// remove user
		await User.findOneAndRemove({ _id: req.user.id });
		res.json({ msg: 'User deleted' });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('server error');
	}
});

// @route PUT api/profile/experience
// @desc add profile expierience
// @acces Private
router.put(
	'/experience',
	[
		auth,
		[
			check('title', 'Title is required')
				.not()
				.isEmpty(),
			check('company', 'company is required')
				.not()
				.isEmpty(),
			check('from', 'from date is required')
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		} = req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.experience.unshift(newExp);
			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route DELETE api/profile/experience/:exp_id
// @desc delete experience from profile
// @acces Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		// get remove index
		const removeIndex = profile.experience
			.map(item => item.id)
			.indexOf(req.params.exp_id);

		profile.experience.splice(removeIndex, 1);
		await profile.save();

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route PUT api/profile/education
// @desc add profile education
// @acces Private
router.put(
	'/education',
	[
		auth,
		[
			check('school', 'School is required')
				.not()
				.isEmpty(),
			check('degree', 'degree is required')
				.not()
				.isEmpty(),
			check('fieldofstudy', 'field of study is required')
				.not()
				.isEmpty(),
			check('from', 'from date is required')
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		} = req.body;

		const newEd = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.education.unshift(newEd);
			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route DELETE api/profile/education/:ed_id
// @desc delete education from profile
// @acces Private
router.delete('/education/:ed_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		// get remove index
		const removeIndex = profile.education
			.map(item => item.id)
			.indexOf(req.params.ed_id);

		profile.education.splice(removeIndex, 1);
		await profile.save();

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route GET api/profile/github/:username
// @desc get user repos from github
// @acces Public
router.get('/github/:username', (req, res) => {
	try {
		const options = {
			uri: `https://api.github.com/users/${
				req.params.username
			}/repos?per_page=5&sort=created:asc&client_id=${config.get(
				'githubClientId'
			)}&client_secret=${config.get('githubSecret')}`,
			method: 'GET',
			headers: { 'user-agent': 'node.js' }
		};

		request(options, (error, response, body) => {
			if (error) console.error(error);

			if (response.statusCode != 200) {
				return res.status(404).json({ msg: 'no github profile found' });
			}

			res.json(JSON.parse(body));
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('server error');
	}
});

//================PROJECT RELATED ROUTES================
// @route PUT api/profile/user/:user_id/offer
// @desc offer user job
// @acces Private
router.put(
	'/user/:user_id/offer',
	[
		auth,
		[
			check('role', 'role is required')
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		try {
			const profile = await Profile.findOne({ user: req.params.user_id });
			const project = await Project.findOne({ owner: req.user.id });
			if (!project) {
				return res.status(400).json({ msg: 'you are not a project owner' });
			}
			if (!profile) {
				return res.status(400).json({ msg: 'user does not exist' });
			}

			// check if already part of project
			if (
				project.members.filter(member => {
					if (member.dev) {
						member.dev.toString() === req.params.user_id.toString();
					}
				}).length > 0
			) {
				return res.status(400).json({ msg: 'user already part of project' });
			}

			// check if vacancy has been filled
			if (
				!project.members.find(
					member => member.role === req.body.role && member.vacancy === true
				)
			) {
				return res.status(400).json({ msg: 'no vacancy' });
			}

			//check if user availible
			if (profile.currentJob) {
				return res.status(400).json({ msg: 'user already employed' });
			}

			// check if already applied
			if (
				project.applicants.filter(
					application =>
						application.dev.toString() === req.params.user_id.toString()
				).length > 0
			) {
				return res.status(400).json({ msg: 'you have already applied' });
			}

			// check if already offerd
			if (
				profile.offers.filter(offer => offer.proj.toString() === project.id)
					.length > 0
			) {
				return res
					.status(400)
					.json({ msg: 'you have already offered this developer a job' });
			}

			profile.offers.push({
				proj: project.id,
				role: req.body.role,
				title: project.title
			});
			const user = await User.findById(req.params.user_id).select('-password');
			project.offered.push({
				dev: req.params.user_id,
				role: req.body.role,
				name: user.name,
				avatar: user.avatar
			});
			await project.save();
			await profile.save();
			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('server error');
		}
	}
);

// @route PUT api/profile/offers/:proj_id/accept
// @desc accept offer
// @acces Private
router.put('/offers/:proj_id/accept', auth, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const profile = await Profile.findOne({ user: req.user.id }).session(
			session
		);
		const offer = profile.offers.find(
			off => off.proj.toString() === req.params.proj_id.toString()
		);
		const project = await Project.findById(req.params.proj_id).session(session);

		// check if vacancy has been filled
		if (
			!project.members.find(
				member => member.role === offer.role && member.vacancy === true
			)
		) {
			throw new Error('no more vacancies left');
		}

		// check if project deleted offer
		const offeredCheck = project.offered.find(
			offer => offer.dev.toString() === req.user.id.toString()
		);

		if (!offeredCheck) {
			throw new Error('project has revoked his offer');
		}

		// check if user already employed
		if (profile.currentJob) {
			throw new Error('user already employed');
		}

		const memIndex = project.members.findIndex(
			member => member.role === offer.role && member.vacancy === true
		);
		const offerIndex = project.offered.findIndex(
			off => off.dev.toString() === req.user.id.toString()
		);

		const user = await User.findById(req.user.id).select('-password');
		project.members[memIndex].dev = req.user.id;
		project.members[memIndex].name = user.name;
		project.members[memIndex].avatar = user.avatar;
		project.members[memIndex].vacancy = false;
		project.offered.splice(offerIndex, 1);

		// check if project has any more positions of applicant role the do the following:
		if (
			!project.members.some(
				mem => mem.vacancy === true && mem.role === offer.role
			)
		) {
			// (1)for each applicant with same role find profile and delete applied ref
			project.applicants.forEach(async app => {
				if (app.role === offer.role) {
					const rejpro = await Profile.findOne({ user: app.dev }).session(
						session
					);
					rejpro.applied.splice(
						rejpro.applied.findIndex(
							a => a.proj.toString() === project.id.toString()
						),
						1
					);
					await rejpro.save();
				}
			});

			// (2)filter out applicants with unavailible role
			project.applicants = project.applicants.filter(
				application => application.role != offer.role
			);

			// (3)for each offer with same role find profile and delete offer
			project.offered.forEach(async offer => {
				if (offer.role === offer.role) {
					const rejpro = await Profile.findOne({ user: offer.dev }).session(
						session
					);
					rejpro.offers.splice(
						rejpro.offers.findIndex(
							a => a.proj.toString() === project.id.toString()
						),
						1
					);
					await rejpro.save();
				}
			});

			// (4)filter out offer with unavailible role END
			project.offered = project.offered.filter(
				offer => offer.role != offer.role
			);
		}

		// check if project is FULL
		if (!project.members.some(mem => mem.vacancy === true)) {
			project.status = 'FULL';
		}

		// set current job of employee, delete offers and applications, add to project list
		profile.currentJob = project.id;
		profile.offers.splice(0, profile.offers.length);
		profile.applied.splice(0, profile.applied.length);
		profile.projects.unshift({
			proj: project.id,
			title: project.title,
			role: offer.role
		});
		await project.save();
		// throw new Error("check transaction");
		await profile.save();
		await session.commitTransaction();
		res.json(project);
	} catch (err) {
		await session.abortTransaction();
		console.error(err.message);
		res.status(500).send(`Server Error ${err.message}`);
	} finally {
		session.endSession();
	}
});
module.exports = router;
