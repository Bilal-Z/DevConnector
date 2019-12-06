import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const Landing = ({ isAuthenticated }) => {
	if (isAuthenticated) {
		return <Redirect to="/dashboard" />;
	}
	return (
		<section className="landing">
			<div className="dark-overlay">
				<div className="landing-inner">
					<img
						src="https://res.cloudinary.com/devconnector/image/upload/v1575296280/devconnector/logo_ixhv0q.png"
						alt="logo"
						className="logo"
					/>
					<p className="large">Connect.Collaborate.Create.</p>
					<div className="buttons">
						<Link to="/register" className="btn btn-primary">
							Sign Up
						</Link>
						<Link to="/login" className="btn btn-light">
							Login
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
};

Landing.propTypes = {
	isAuthenticated: PropTypes.bool
};

const mapStateToProps = state => ({
	isAuthenticated: state.auth.isAuthenticated
});

export default connect(mapStateToProps)(Landing);
