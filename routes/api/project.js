const express = require("express");
const request = require("request");
const router = express.Router();
const mongoose = require("mongoose");
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
        proj: project.id,
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

// @route PUT api/project/members
// @desc add a new member position
// @acces Private
router.put(
  "/members",
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

      // check if user already enrolled in a project
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

      const profile = await Profile.findOne({ user: req.user.id });
      profile.applied.push({ proj: req.params.proj_id, role: req.body.role });
      await profile.save();
      project.applicants.push(newApplicant);
      await project.save();
      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route PUT api/project/applications/:user_id/accept
// @desc accept application
// @acces Private
router.put("/applications/:user_id/accept", auth, async (req, res) => {
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
      throw new Error("no more vacancies left");
    }

    const application = profile.applied.find(
      application => application.proj.toString() === project.id.toString()
    );

    // check if applicant deleted application
    if (!application) {
      throw new Error("applicant has revoked his application");
    }

    // check if applicant employed
    if (profile.currentJob) {
      throw new Error("applicant found another job");
    }

    const memIndex = project.members.findIndex(
      member => member.role === applicant.role && member.vacancy === true
    );
    const appIndex = project.applicants.findIndex(
      app => app.role === applicant.role && app.vacancy === true
    );
    project.members[memIndex].dev = req.params.user_id;
    project.members[memIndex].vacancy = false;
    project.applicants.splice(appIndex, 1);

    if (!project.members.some(mem => mem.vacancy === true)) {
      project.status = "FULL";
      project.offered.length = 0;
      project.applicants.length = 0;
    }

    // set current job of employee, delete offers and applications, add to project list
    profile.currentJob = project.id;
    profile.offers.length = 0;
    profile.applied.length = 0;
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
