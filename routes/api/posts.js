const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Project');

// @route POST api/project/:proj_id/posts
// @desc Create a post
// @acces Private
router.post(
	'/:proj_id/posts',
	[
		auth,
		[
			check('title', 'title is required')
				.not()
				.isEmpty(),
			check('text', 'Text is required')
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
			if (
				req.user.id.toString() != project.owner.toString() &&
				project.members.filter(member => {
					if (member.dev) {
						if (member.dev.toString() === req.user.id.toString())
							return member.dev.toString();
					}
				}).length === 0
			) {
				return res.status(400).json({ msg: 'user not part of project' });
			}
			const newPost = {
				title: req.body.title,
				text: req.body.text,
				user: req.user.id
			};
			project.posts.unshift(newPost);
			await project.save();

			res.json(project);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route GET api/posts/:id
// @desc get post by id
// @acces Private
router.get('/:proj_id/posts/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		res.json(post);
	} catch (err) {
		console.error(err.message);
		if (err.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route DELETE api/posts/:id
// @desc delete a post
// @acces Private
router.delete('/:proj_id/posts/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);

		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		// check user
		if (post.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'user not authorised' });
		}

		await post.remove();

		res.json({ msg: 'post removed' });
	} catch (err) {
		console.error(err.message);
		if (err.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route POST api/posts/comment/:id
// @desc Comment on a post
// @acces Private
router.post(
	'/:proj_id/posts/comment/:id',
	[
		auth,
		[
			check('text', 'Text is required')
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
			const user = await User.findById(req.user.id).select('-password');
			const post = await Post.findById(req.params.id);

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id
			};

			post.comments.unshift(newComment);

			await post.save();

			res.json(post.comments);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route DELETE api/posts/comment/:id/:comment_id
// @desc Delete a comment on a post
// @acces Private
router.delete(
	'/:proj_id/posts/comment/:id/:comment_id',
	auth,
	async (req, res) => {
		try {
			const post = await Post.findById(req.params.id);

			// pull out comment
			const comment = post.comments.find(
				comment => comment.id === req.params.comment_id
			);

			if (!comment) {
				return res.status(404).json({ msg: 'comment does not exist' });
			}

			// check user
			if (comment.user.toString() !== req.user.id) {
				return res.status(401).json({ msg: 'user not authorised' });
			}

			const removeIndex = post.comments
				.map(comment => comment.user.toString())
				.indexOf(req.user.id);

			post.comments.splice(removeIndex, 1);

			await post.save();
			res.json(post.comments);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;
