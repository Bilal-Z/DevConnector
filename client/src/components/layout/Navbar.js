import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';

const Navbar = ({
	auth: { isAuthenticated, loading },
	logout,
	profile: { profile }
}) => {
	let authLinks;

	if (profile && profile.currentJob) {
		authLinks = (
			<ul>
				<li>
					<Link to="/project">
						<i className="fas fa-project-diagram"></i> Project
					</Link>
				</li>
				<li>
					<Link to="/dashboard">
						<i className="fas fa-user"></i> Dashboard
					</Link>
				</li>
				<li>
					<a onClick={logout} href="#!">
						<i className="fas fa-sign-out-alt"></i> Logout
					</a>
				</li>
			</ul>
		);
	} else {
		authLinks = (
			<ul>
				<li>
					<Link to="/dashboard">
						<i className="fas fa-user"></i> Dashboard
					</Link>
				</li>
				<li>
					<a onClick={logout} href="#!">
						<i className="fas fa-sign-out-alt"></i> Logout
					</a>
				</li>
			</ul>
		);
	}
	const guestLinks = (
		<ul>
			<li>
				<Link to="/register">Register</Link>
			</li>
			<li>
				<Link to="/login">Login</Link>
			</li>
		</ul>
	);

	return (
		<nav className="navbar bg-dark">
			<Link to="/" style={{ padding: 0, margin: 0 }}>
				<img
					src="https://res.cloudinary.com/devconnector/image/upload/v1575296731/devconnector/icon_psnec7.png"
					alt=""
					className="nav-logo"
				/>
			</Link>
			{!loading && (
				<Fragment>{isAuthenticated ? authLinks : guestLinks}</Fragment>
			)}
		</nav>
	);
};

Navbar.propTypes = {
	logout: PropTypes.func.isRequired,
	profile: PropTypes.object.isRequired,
	auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	auth: state.auth,
	profile: state.profile
});

export default connect(mapStateToProps, { logout })(Navbar);
