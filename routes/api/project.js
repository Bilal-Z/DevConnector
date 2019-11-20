const express = require("express");
const request = require("request");
const router = express.Router();
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Project = require("../../models/Project");

// @route POST api/project
// @desc create a project
// @acces Private
router.post(
  "/",
  [
    auth,
    [
      check("title", "title is required")
        .not()
        .isEmpty(),
      check("team", "team roles are required")
        .not()
        .isEmpty(),
      check("description", "description is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const teamRoles = req.body.team.split(",").map(role => ({
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
        return res.status(400).json({ msg: "user already has project" });
      }
      project = await Project.findOne({
        members: { $elemMatch: { dev: req.user.id } }
      });
      if (project) {
        return res.status(400).json({ msg: "user already part of a project" });
      }

      project = await newProj.save();
      const profile = await Profile.findOne({ user: req.user.id });
      profile.currentJob = project.id;
      profile.projects.unshift({
        id: project.id,
        title: project.title,
        role: "LEADER"
      });
      profile.save();
      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route PUT api/project/:proj_id/apply
// @desc apply to project
// @acces Private
router.put(
  "/:proj_id/apply",
  [
    auth,
    [
      check("role", "role is required")
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

      const newApplicant = {
        role: req.body.role,
        dev: req.user.id
      };

      // check if user already enrolledin project
      let proj = await Project.findOne({ owner: req.user.id });
      if (proj) {
        return res.status(400).json({ msg: "user already has project" });
      }
      proj = await Project.findOne({
        members: { $elemMatch: { dev: req.user.id } }
      });
      if (proj) {
        return res.status(400).json({ msg: "user already part of a project" });
      }

      // check vacancy
      if (
        !Project.findOne({
          members: { $elemMatch: { vacancy: true, role: newApplicant.role } }
        })
      ) {
        return res.status(400).json({ msg: "no vacancy for role" });
      }

      // check if already applied
      if (
        project.applicants.filter(
          application => application.dev.toString() === req.user.id
        ).length > 0
      ) {
        return res.status(400).json({ msg: "you have already applied" });
      }

      project.applicants.push(newApplicant);
      await project.save();
      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route PUT api/project/apply/:user_id/accept
// @desc accept application
// @acces Private
router.put("/apply/:user_id/accept", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.user_id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
module.exports = router;
