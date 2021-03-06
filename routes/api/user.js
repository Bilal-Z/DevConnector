const express = require('express');
const router = express.Router();
// const multer = require('multer');
// const cloudinary = require('cloudinary');
// const cloudinaryStorage = require('multer-storage-cloudinary');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route POST api/users
// @desc Regiter User
// @acces Public
router.post(
	'/',
	[
		check('name', 'Name is Required')
			.not()
			.isEmpty(),
		check('email', 'Please include a valid email').isEmail(),
		check('password', 'Password must be at least 6 characters').isLength({
			min: 6
		})
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { name, email, password, avatar } = req.body;

		try {
			// see if users exists
			let user = await User.findOne({ email });

			if (user) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'User already exists' }] });
			}

			user = new User({
				name,
				email,
				avatar,
				password
			});

			// encrypt password using bcrypt
			const salt = await bcrypt.genSalt(10);

			user.password = await bcrypt.hash(password, salt);

			await user.save();

			const payload = {
				user: {
					id: user.id
				}
			};

			jwt.sign(
				payload,
				config.get('jwtSecret'),
				{ expiresIn: 36000000 },
				(err, token) => {
					if (err) throw err;
					res.json({ token });
				}
			);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('server error');
		}
	}
);

module.exports = router;
