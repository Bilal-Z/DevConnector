import React, { useState, Fragment } from 'react';
import Select from 'react-select';
import { Link, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { setAlert } from '../../actions/alert';
import PropTypes from 'prop-types';
import { createProfile } from '../../actions/profile';

const CreateProfile = ({ setAlert, createProfile, history }) => {
	const [formData, setFormData] = useState({
		website: '',
		location: '',
		skills: '',
		githubusername: '',
		bio: '',
		twitter: '',
		facebook: '',
		linkedin: '',
		youtube: '',
		instagram: ''
	});

	const [displaySocial, toggleSocial] = useState(false);

	const {
		website,
		location,
		skills,
		githubusername,
		bio,
		twitter,
		facebook,
		linkedin,
		youtube,
		instagram
	} = formData;

	const options = [
		{ value: 'C/Cpp', label: 'C/Cpp' },
		{ value: 'python', label: 'python' },
		{ value: 'javascript', label: 'javascript' },
		{ value: 'django', label: 'django' },
		{ value: 'flask', label: 'flask' },
		{ value: 'UI/UX', label: 'UI/UX' },
		{ value: 'NodeJs', label: 'NodeJs' },
		{ value: 'React', label: 'React' },
		{ value: 'Angular', label: 'Angular' },
		{ value: 'MongoDB', label: 'MongoDB' },
		{ value: 'MySQL', label: 'MySQL' },
		{ value: 'PostgreSQL', label: 'PostgreSQL' }
	];

	const onChange = e => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const skillChange = skills => {
		setFormData({ ...formData, skills: skills });
	};

	const onSubmit = e => {
		e.preventDefault();
		if (!skills) {
			setAlert('no skills added', 'danger');
		} else {
			createProfile(
				{
					website,
					location,
					skills: skills.map(skill => skill.value).join(),
					githubusername,
					bio,
					twitter,
					facebook,
					linkedin,
					youtube,
					instagram
				},
				history
			);
		}
	};

	return (
		<Fragment>
			<h1 className="large text-primary">Create Your Profile</h1>
			<p className="lead">
				<i className="fas fa-user"></i> Let's get some information to make your
				profile stand out
			</p>

			<form className="form" onSubmit={e => onSubmit(e)}>
				<div className="form-group">
					<input
						type="text"
						placeholder="Website"
						name="website"
						value={website}
						onChange={e => onChange(e)}
					/>
					<small className="form-text">your website</small>
				</div>
				<div className="form-group">
					<input
						type="text"
						placeholder="Location"
						name="location"
						value={location}
						onChange={e => onChange(e)}
					/>
					<small className="form-text">
						City & Country suggested (eg. Karachi, Pakistan)
					</small>
				</div>
				<div className="form-group">
					<Select
						options={options}
						isMulti={true}
						placeholder="Skills"
						value={skills}
						onChange={skillChange}
					/>
					<small className="form-text">your skills</small>
				</div>
				<div className="form-group">
					<input
						type="text"
						placeholder="Github Username"
						name="githubusername"
						value={githubusername}
						onChange={e => onChange(e)}
					/>
					<small className="form-text">
						If you want your latest repos and a Github link, include your
						username
					</small>
				</div>
				<div className="form-group">
					<textarea
						placeholder="A short bio of yourself"
						name="bio"
						value={bio}
						onChange={e => onChange(e)}
					></textarea>
					<small className="form-text">Tell us a little about yourself</small>
				</div>

				<div className="my-2">
					<button
						onClick={() => toggleSocial(!displaySocial)}
						type="button"
						className="btn btn-light"
					>
						Add Social Network Links
					</button>
					<span>Optional</span>
				</div>

				{displaySocial && (
					<Fragment>
						<div className="form-group social-input">
							<i className="fab fa-twitter fa-2x"></i>
							<input
								type="text"
								placeholder="Twitter URL"
								name="twitter"
								value={twitter}
								onChange={e => onChange(e)}
							/>
						</div>

						<div className="form-group social-input">
							<i className="fab fa-facebook fa-2x"></i>
							<input
								type="text"
								placeholder="Facebook URL"
								name="facebook"
								value={facebook}
								onChange={e => onChange(e)}
							/>
						</div>

						<div className="form-group social-input">
							<i className="fab fa-youtube fa-2x"></i>
							<input
								type="text"
								placeholder="YouTube URL"
								name="youtube"
								value={youtube}
								onChange={e => onChange(e)}
							/>
						</div>

						<div className="form-group social-input">
							<i className="fab fa-linkedin fa-2x"></i>
							<input
								type="text"
								placeholder="Linkedin URL"
								name="linkedin"
								value={linkedin}
								onChange={e => onChange(e)}
							/>
						</div>

						<div className="form-group social-input">
							<i className="fab fa-instagram fa-2x"></i>
							<input
								type="text"
								placeholder="Instagram URL"
								name="instagram"
								value={instagram}
								onChange={e => onChange(e)}
							/>
						</div>
					</Fragment>
				)}

				<input type="submit" className="btn btn-primary my-1" />
			</form>
		</Fragment>
	);
};

CreateProfile.propTypes = {
	createProfile: PropTypes.func.isRequired,
	setAlert: PropTypes.func.isRequired
};

export default connect(null, { setAlert, createProfile })(
	withRouter(CreateProfile)
);
