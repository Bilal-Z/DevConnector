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

			profile.offers.push({ proj: project.id, role: req.body.role });
			project.offered.push({ dev: req.params.user_id, role: req.body.role });
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

module.exports = router;
