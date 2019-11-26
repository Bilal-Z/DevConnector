const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Project");

// @route POST api/project/:proj_id/posts
// @desc Create a post
// @acces Private
router.post(
  "/:proj_id/posts",
  [
    auth,
    [
      check("title", "title is required")
        .not()
        .isEmpty(),
      check("text", "Text is required")
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
        return res.status(400).json({ msg: "user not part of project" });
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
      res.status(500).send("Server Error");
    }
  }
);

// @route GET api/project/:proj_id/posts/:post_id
// @desc get post by id
// @acces Private
router.get("/:proj_id/posts/:post_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const project = await Project.findById(req.params.proj_id)
      .populate({
        path: "posts.user",
        select: "name avatar"
      })
      .populate({
        path: "posts.comments.user",
        select: "name avatar"
      })
      .exec();
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    if (
      !profile.currentJob ||
      profile.currentJob.toString() != project.id.toString()
    ) {
      return res.status(404).json({ msg: "user not part of project" });
    }
    const post = project.posts.id(req.params.post_id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route DELETE api/posts/:post_id
// @desc delete a post
// @acces Private
router.delete("/:proj_id/posts/:post_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const project = await Project.findById(req.params.proj_id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    if (
      !profile.currentJob ||
      profile.currentJob.toString() != project.id.toString()
    ) {
      return res.status(404).json({ msg: "user not part of project" });
    }
    const post = project.posts.id(req.params.post_id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }
    if (post.user.toString() != req.user.id.toString()) {
      return res.status(404).json({ msg: "user not authorised" });
    }
    project.posts = project.posts.filter(
      post => post.id.toString() != req.params.post_id.toString()
    );
    await project.save();
    res.json({ msg: "post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route POST api/project/:proj_id/posts/comment/:post_id
// @desc Comment on a post
// @acces Private
router.post(
  "/:proj_id/posts/comment/:post_id",
  [
    auth,
    [
      check("text", "Text is required")
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
      const profile = await Profile.findOne({ user: req.user.id });
      const project = await Project.findById(req.params.proj_id);
      if (!project) {
        return res.status(404).json({ msg: "Project not found" });
      }
      if (
        !profile.currentJob ||
        profile.currentJob.toString() != project.id.toString()
      ) {
        return res.status(404).json({ msg: "user not part of project" });
      }
      const post = project.posts.id(req.params.post_id);
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      const postIndex = project.posts.findIndex(
        post => post === project.posts.id(req.params.post_id)
      );
      project.posts[postIndex].comments.push({
        user: req.user.id,
        text: req.body.text
      });
      await project.save();
      res.redirect(
        `http://localhost:5000/api/project/${req.params.proj_id}/posts/${req.params.post_id}`
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route DELETE api/posts/comment/:id/:comment_id
// @desc Delete a comment on a post
// @acces Private
router.delete(
  "/:proj_id/posts/comment/:post_id/:comment_id",
  auth,
  async (req, res) => {
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      const project = await Project.findById(req.params.proj_id);
      if (!project) {
        return res.status(404).json({ msg: "Project not found" });
      }
      if (
        !profile.currentJob ||
        profile.currentJob.toString() != project.id.toString()
      ) {
        return res.status(404).json({ msg: "user not part of project" });
      }
      const post = project.posts.id(req.params.post_id);
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      const postIndex = project.posts.findIndex(
        post => post === project.posts.id(req.params.post_id)
      );
      const comment = post.comments.id(req.params.comment_id);
      if (!comment) {
        return res.status(404).json({ msg: "Post not found" });
      }
      const commentIndex = post.comments.findIndex(
        comment => comment === post.comments.id(req.params.comment_id)
      );
      if (comment.user.toString() != req.user.id.toString()) {
        return res.status(404).json({ msg: "user not authorised" });
      }
      project.posts[postIndex].comments.splice(commentIndex, 1);
      await project.save();
      res.redirect(
        `http://localhost:5000/api/project/${req.params.proj_id}/posts/${req.params.post_id}`
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
