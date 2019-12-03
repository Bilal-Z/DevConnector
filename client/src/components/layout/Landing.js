import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
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

export default Landing;
