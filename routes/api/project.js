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
			const profile = await Profile.findOne({ user: req.user.id });
			profile.currentJob = project.id;
			profile.projects.unshift({
				proj: project.id,
				title: project.title,
				role: 'LEADER'
			});
			profile.save();
			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route PUT api/project/members
// @desc add a new member position
// @acces Private
router.put(
	'/members',
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
			const project = await Project.findOne({ owner: req.user.id });
			project.members.push({ role: req.body.role });
			if (project.status === 'FULL') {
				project.status = 'HIRING';
			}
			await project.save();
			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route PUT api/project/:proj_id/apply
// @desc apply to project
// @acces Private
router.put(
	'/:proj_id/apply',
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
			const project = await Project.findById(req.params.proj_id);
			const profile = await Profile.findOne({ user: req.user.id });

			if (!project) {
				return res.status(400).json({ msg: 'project does not exist' });
			}

			const newApplicant = {
				role: req.body.role,
				dev: req.user.id
			};

			// check if user already enrolled in a project
			if (profile.currentJob) {
				return res.status(400).json({ msg: 'user already has project' });
			}

			// check vacancy
			if (
				!project.members.some(
					mem => mem.vacancy === true && mem.role === req.body.role
				)
			) {
				return res.status(400).json({ msg: 'no vacancy for role' });
			}

			// check if already applied
			if (
				project.applicants.filter(
					application => application.dev.toString() === req.user.id
				).length > 0
			) {
				return res.status(400).json({ msg: 'you have already applied' });
			}

			// check if already offered
			if (
				project.offered.filter(offer => offer.dev.toString() === req.user.id)
					.length > 0
			) {
				return res.status(400).json({ msg: 'you have been offered a role' });
			}

			profile.applied.push({ proj: req.params.proj_id, role: req.body.role });
			await profile.save();
			project.applicants.push(newApplicant);
			await project.save();
			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route PUT api/project/applications/:user_id/accept
// @desc accept application
// @acces Private
router.put('/applications/:user_id/accept', auth, async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const project = await Project.findOne({ owner: req.user.id }).session(
			session
		);
		const applicant = project.applicants.find(
			application =>
				application.dev.toString() === req.params.user_id.toString()
		);
		const profile = await Profile.findOne({ user: req.params.user_id }).session(
			session
		);

		// check if vacancy has been filled
		if (
			!project.members.find(
				member => member.role === applicant.role && member.vacancy === true
			)
		) {
			throw new Error('no more vacancies left');
		}

		// check if applicant deleted application
		const application = profile.applied.find(
			application => application.proj.toString() === project.id.toString()
		);

		if (!application) {
			throw new Error('applicant has revoked his application');
		}

		// check if applicant employed
		if (profile.currentJob) {
			throw new Error('applicant found another job');
		}

		const memIndex = project.members.findIndex(
			member => member.role === applicant.role && member.vacancy === true
		);
		const appIndex = project.applicants.findIndex(
			app => app.dev.toString() === req.params.user_id
		);

		project.members[memIndex].dev = req.params.user_id;
		project.members[memIndex].vacancy = false;
		project.applicants.splice(appIndex, 1);

		// check if project has any more positions of applicant role the do the following:
		if (
			!project.members.some(
				mem => mem.vacancy === true && mem.role === applicant.role
			)
		) {
			// (1)for each applicant with same role find profile and delete applied ref
			project.applicants.forEach(async app => {
				if (app.role === applicant.role) {
					const rejpro = await Profile.findOne({ user: app.dev }).session(
						session
					);
					rejpro.applied.splice(
						rejpro.applied.findIndex(
							a => a.proj.toString() === project.id.toString()
						),
						1
					);
					rejpro.save();
				}
			});

			// (2)filter out applicants with unavailible role
			project.applicants = project.applicants.filter(
				application => application.role != applicant.role
			);

			// (3)for each offer with same role find profile and delete offer
			project.offered.forEach(async offer => {
				if (offer.role === applicant.role) {
					const rejpro = await Profile.findOne({ user: offer.dev }).session(
						session
					);
					rejpro.offers.splice(
						rejpro.offers.findIndex(
							a => a.proj.toString() === project.id.toString()
						),
						1
					);
					rejpro.save();
				}
			});

			// (4)filter out offer with unavailible role END
			project.offered = project.offered.filter(
				offer => offer.role != applicant.role
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
			role: applicant.role
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
