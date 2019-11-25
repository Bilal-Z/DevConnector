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

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      if (profile.currentJob) {
        return res.status(400).json({ msg: "user already has a project" });
      }
      // requires change to array implementation
      const teamRoles = req.body.team.split(",").map(role => ({
        role: role.trim()
      }));

      const user = await User.findById(req.user.id).select("-password");
      const project = new Project({
        ownerName: user.name,
        ownerAvatar: user.avatar,
        owner: req.user.id,
        title: req.body.title,
        description: req.body.description,
        members: teamRoles
      });
      await project.save();
      profile.currentJob = project.id;
      // delete references in applicants and applied
      profile.offers.splice(0, profile.offers.length);
      profile.applied.splice(0, profile.applied.length);
      profile.projects.unshift({
        proj: project.id,
        title: project.title,
        role: "LEADER"
      });
      await profile.save();
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
      const project = await Project.findOne({ owner: req.user.id });
      if (!project) {
        return res.status(400).json({ msg: "user does not have project" });
      }
      project.members.push({ role: req.body.role });
      if (project.status === "FULL") {
        project.status = "HIRING";
      }
      await project.save();
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
      const profile = await Profile.findOne({ user: req.user.id });

      if (!project) {
        return res.status(400).json({ msg: "project does not exist" });
      }

      const user = await User.findById(req.user.id).select("-password");
      const newApplicant = {
        role: req.body.role,
        dev: req.user.id,
        name: user.name,
        avatar: user.avatar
      };

      // check if already a member
      if (
        project.members.filter(member => {
          if (
            member.dev &&
            member.dev.toString() === req.params.user_id.toString()
          ) {
            return member.dev.toString();
          }
        }).length > 0
      ) {
        return res.status(400).json({ msg: "user already part of project" });
      }

      // check if user already enrolled in a project
      if (profile.currentJob) {
        return res.status(400).json({ msg: "user already has project" });
      }

      // check vacancy
      if (
        !project.members.some(
          mem => mem.vacancy === true && mem.role === req.body.role
        )
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

      // check if already offered
      if (
        project.offered.filter(offer => offer.dev.toString() === req.user.id)
          .length > 0
      ) {
        return res.status(400).json({ msg: "you have been offered a role" });
      }

      profile.applied.push({
        proj: req.params.proj_id,
        title: project.title,
        role: req.body.role
      });
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

    // check if applicant deleted application
    const application = profile.applied.find(
      application => application.proj.toString() === project.id.toString()
    );

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
      app => app.dev.toString() === req.params.user_id
    );

    const user = await User.findById(req.params.user_id).select("-password");
    project.members[memIndex].dev = req.params.user_id;
    project.members[memIndex].name = user.name;
    project.members[memIndex].avatar = user.avatar;
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
          await rejpro.save();
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
          await rejpro.save();
        }
      });

      // (4)filter out offer with unavailible role END
      project.offered = project.offered.filter(
        offer => offer.role != applicant.role
      );
    }

    // check if project is FULL
    if (!project.members.some(mem => mem.vacancy === true)) {
      project.status = "FULL";
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

// @route DELETE api/project/members/:user_id
// @desc remove user from project
// @acces Private
router.delete("/members/:user_id", auth, async (req, res) => {
  try {
    const project = await Project.findOne({ owner: req.user.id });
    const profile = await Profile.findOne({ user: req.params.user_id });
    if (
      project.members.filter(member => {
        if (member.dev && member.dev.toString() === req.user.id.toString()) {
          return member.dev.toString();
        }
      }).length === 0
    ) {
      return res.status(400).json({ msg: "user not part of project" });
    }
    project.members = project.members.filter(
      member => member.dev.toString() != req.params.user_id.toString()
    );
    project.tasks = project.tasks.filter(
      task => task.dev.toString() != req.params.user_id.toString()
    );
    profile.currentJob = null;
    profile.projects = profile.projects.filter(
      project => project.proj.toString() != project.id.toString()
    );
    await profile.save();
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server Error`);
  }
});

// @route DELETE api/project/leave
// @desc leave project
// @acces Private
router.delete("/leave", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile.currentJob) {
      return res.status(400).json({ msg: "user not part of project" });
    }
    const project = await Project.findById(profile.currentJob);
    if (
      project.members.filter(member => {
        if (member.dev && member.dev.toString() === req.user.id.toString()) {
          return member.dev.toString();
        }
      }).length === 0
    ) {
      return res.status(400).json({ msg: "user not part of project" });
    }
    project.members = project.members.filter(
      member => member.dev.toString() != req.user.id.toString()
    );
    project.tasks = project.tasks.filter(
      task => task.dev.toString() != req.user.id.toString()
    );
    profile.currentJob = null;
    profile.projects = profile.projects.filter(
      project => project.proj.toString() != project.id.toString()
    );
    await profile.save();
    await project.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server Error`);
  }
});

// =============TASK ROUTES================
// @route PUT api/project/task/new/:user_id
// @desc add task to project
// @acces Private
router.put(
  "/task/new/:user_id",
  [
    auth,
    [
      check("title", "title is required")
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
    try {
      const project = await Project.findOne({ owner: req.user.id });
      if (!project) {
        return res.status(400).json({ msg: "user does not have project" });
      }
      if (
        project.members.filter(member => {
          if (
            member.dev &&
            member.dev.toString() === req.params.user_id.toString()
          ) {
            return member.dev.toString();
          }
        }).length === 0
      ) {
        return res.status(400).json({ msg: "user not part of project" });
      }
      const user = await User.findById(req.params.user_id).select("-password");
      project.tasks.push({
        dev: req.params.user_id,
        name: user.name,
        avatar: user.avatar,
        title: req.body.title,
        description: req.body.description
      });
      await project.save();
      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route PUT api/project/task/:task_id
// @desc push task forward
// @acces Private
router.put("/task/:task_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const project = await Project.findById(profile.currentJob);
    if (
      !profile.currentJob ||
      profile.currentJob.toString() != project.id.toString()
    ) {
      return res.status(400).json({ msg: "user not part of project" });
    }

    const taskIndex = project.tasks.findIndex(
      task => task === project.tasks.id(req.params.task_id)
    );

    if (project.tasks[taskIndex].dev.toString() != req.user.id.toString()) {
      return res.status(400).json({ msg: "task does not belong developer" });
    }

    if (project.tasks[taskIndex].status === "TODO") {
      project.tasks[taskIndex].status = "DOING";
    } else if (project.tasks[taskIndex].status === "DOING") {
      project.tasks[taskIndex].status = "DONE";
    }
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route PUT api/project/task/:task_id/return
// @desc send task back
// @acces Private
router.put(
  "/task/:task_id/return",
  [
    auth,
    [
      check("note", "note is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      const project = await Project.findById(profile.currentJob);
      if (
        !profile.currentJob ||
        profile.currentJob.toString() != project.id.toString() ||
        req.user.id.toString() != project.owner.toString()
      ) {
        return res.status(400).json({ msg: "user not project owner" });
      }

      const taskIndex = project.tasks.findIndex(
        task => task === project.tasks.id(req.params.task_id)
      );

      if (project.tasks[taskIndex].status != "DONE") {
        return res.status(400).json({ msg: "task not marked done" });
      }

      project.tasks[taskIndex].status = "DOING";
      project.tasks[taskIndex].note = req.body.note;
      await project.save();
      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route PUT api/project/task/:task_id/close
// @desc close task mark as complete
// @acces Private
router.put("/task/:task_id/close", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const project = await Project.findById(profile.currentJob);
    if (
      !profile.currentJob ||
      profile.currentJob.toString() != project.id.toString() ||
      req.user.id.toString() != project.owner.toString()
    ) {
      return res.status(400).json({ msg: "user not project owner" });
    }

    const taskIndex = project.tasks.findIndex(
      task => task === project.tasks.id(req.params.task_id)
    );

    if (project.tasks[taskIndex].status != "DONE") {
      return res.status(400).json({ msg: "task not marked done" });
    }

    project.tasks[taskIndex].status = "COMPLETE";

    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
