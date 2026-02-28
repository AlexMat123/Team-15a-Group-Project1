import './About.css';

function About() {
  return (
    <div className="about">
      <h1>About This Project</h1>
      <div className="about-content">
        <p>
          This is a MERN stack application built by Team 15a.
        </p>
        <h2>Tech Stack</h2>
        <ul className="tech-list">
          <li><strong>MongoDB</strong> - Database</li>
          <li><strong>Express.js</strong> - Backend Framework</li>
          <li><strong>React</strong> - Frontend Library</li>
          <li><strong>Node.js</strong> - Runtime Environment</li>
        </ul>
      </div>
    </div>
  );
}

export default About;
