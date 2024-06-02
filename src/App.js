import React, { useState } from 'react';
import problems from './problems.json';
import Categories from './Categories';
import Modal from 'react-modal';
import './Banner.css';

Modal.setAppElement('#root');

function App() {
  // init 7 CS106B topics, default rank, dirichletCount to update, and priorCount calculated from poll (which does not update during app)
  const [topics, setTopics] = useState([
    { id: 'Programming in C++ and Big-O', name: 'Programming in C++ and Big-O', rank: 1, dirichletCount: 1, priorCount: 1 },
    { id: 'ADTs', name: 'ADTs', rank: 2, dirichletCount: 1, priorCount: 1 },
    { id: 'Recursion', name: 'Recursion', rank: 3, dirichletCount: 4, priorCount: 4 },
    { id: 'Backtracking', name: 'Backtracking', rank: 4, dirichletCount: 6, priorCount: 6 },
    { id: 'Classes', name: 'Classes', rank: 5, dirichletCount: 1, priorCount: 1 },
    { id: 'Linked Lists', name: 'Linked Lists', rank: 6, dirichletCount: 2, priorCount: 2 },
    { id: 'Trees', name: 'Trees', rank: 7, dirichletCount: 2, priorCount: 2 }
  ]);
  const [recommendedProblems, setRecommendedProblems] = useState([]);
  const [completedProblems, setCompletedProblems] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [feedback, setFeedback] = useState(3);  // Default feedback is 3, "average"
  const customStyles = {
    content: {
      width: '700px',    // Set the desired width
      height: '300px',   // Set the desired height
      margin: 'auto',    // Center the modal
      padding: '20px',   // Adjust padding as needed
      borderRadius: '10px', // Optional: add rounded corners
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)', // Optional: add a box shadow
      fontFamily: 'Source Sans Pro, sans-serif', // Set the font family
      fontSize: '1.2em',  // Set the font size
      color: '#636466',   // Set the default font color
    },
  };
  
  
  // Function: handleRankChange
  // when user moves topics around, reflect change and change rank number
  const handleRankChange = (newTopics) => {
    setTopics(newTopics.map((topic, index) => ({ ...topic, rank: index + 1 })));
  };

  // Function: handleSubmit
  // for when user submits topic preference rankings
  const handleSubmit = () => {
    // for each topic, use the prior and add the inverse-rank value to it. 
    //i.e., dirichlet count gets *reset* each time rankings are
    // submitted, rather than cumulative observations (see feedback section for accumulating counts for dirichlet)
    const updatedTopics = topics.map(topic => ({
      ...topic,
      dirichletCount: topic.priorCount + (8 - topic.rank) // prior + preference (8 - rank, because #1 is highest preference, etc.)
    }));
    
    setTopics(updatedTopics); // make changes to the topics array
    console.log("Updated Dirichlet counts after ranking submission:", updatedTopics.map(t => ({name: t.name, dirichletCount: t.dirichletCount})));
    
    // make top 3 problems rec based on these updated counts
    fetchProblems(updatedTopics);
    alert('Rankings submitted!');
  };
  
  // Function: reccommendNewProblems
  // seperate function for the "Recommend New Problems" button. 
  // Now, updated counts from user feedback are used.
  const recommendNewProblems = () => {
    fetchProblems(topics);
  };

  // Function: fetchProblems
  // given the current dirichlet counts, use MAP to select the top 3 topics,
  // and then select one random problem from the top 3 MAP topics
  const fetchProblems = (updatedTopics) => {
    const m = updatedTopics.length;
    // calculates all DirichletCounts across topics, including imaginary and new trials
    // essentially two summations in multinomial MAP equation
    const totalDirichletCounts = updatedTopics.reduce((acc, cur) => acc + cur.dirichletCount, 0);
    
    // call MAP, and create a new array to sort topics by MAP without altering the original state
    const topicsWithCalculatedMAP = updatedTopics.map(topic => ({
      ...topic,
      MAP: MAP(topic.dirichletCount, totalDirichletCounts, m)
    }));
    // sort by calculated MAPs, take top 3 topics
    const sortedTopics = topicsWithCalculatedMAP.sort((a, b) => b.MAP - a.MAP).slice(0, 3);
    // Log MAP values
    console.log("MAP values for all topics:", topicsWithCalculatedMAP.map(t => ({name: t.name, MAP: t.MAP})));

    // Select one random problem from each of the top three topics
    let selectedProblems = sortedTopics.map(topic => {
       // get just valid top 3 topic problems, and don't repeat completed problems
      const topicProblems = problems.filter(problem => problem.topic === topic.name && !completedProblems.includes(problem.name));
      return topicProblems[Math.floor(Math.random() * topicProblems.length)];
    }).filter(problem => problem); // Ensure undefined values are removed in case of empty filters
  
    setRecommendedProblems(selectedProblems); // update UI for recommended problems
    console.log("Top 3 Recommended Problems based on MAP:", selectedProblems);
  };

  // Function: MAP
  // implements MAP equation. dirichletCount has imaginary and new counts.
  // totalDirichletCounts has the two summations of all counts, real and imaginary.
  // m is the total number of topics, which we subtract
  const MAP = (dirichletCount, totalDirichletCounts, m) => {
    return (dirichletCount - 1) / (totalDirichletCounts - m);
  };
  
  // Function: markAsCompleted
  // handles when user marks a problem as complete.
  // add problem to set of completed problems to avoid repeat recommendations
  const markAsCompleted = (problemName, topicId) => {
    if (!completedProblems.includes(problemName)) {
      setCompletedProblems([...completedProblems, problemName]);
    }
    setCurrentProblem({ problemName, topicId });
    setModalIsOpen(true);
  };  
  
  // Function: handleFeedbackSubmit
  // when user *submits* feedback, we take that as an observation. Update dirichlet counts!
  const handleFeedbackSubmit = () => {
    console.log("Current feedback value:", feedback);  // Log raw feedback input
    const feedbackRank = parseInt(feedback, 10); // get user feedback 1-5
    console.log("Current problem being updated:", currentProblem);
  
    // update topics based on feedback.
    // here, the feedback (1-5) is added to the current topic. The "leftover"/reverse is added to the *other* topics
    // sort of like an extension (with more gradient options) of the Beta. Either something "happens" and we add a success
    // count, or it doesn't and we add a failure count
    const updatedTopics = topics.map(topic => ({
      ...topic,
      // if topic == problem topic, add feedback value directly. Else, add inverse
      dirichletCount: topic.id === currentProblem.topicId ? topic.dirichletCount + feedbackRank : topic.dirichletCount + (5 - feedbackRank)
    }));
  
    // Log before updating state (debugging)
    console.log("Pre-update Dirichlet counts:", topics.map(t => ({name: t.name, dirichletCount: t.dirichletCount})));
    
    // Update topics state
    setTopics(updatedTopics);
  
    // Log after updating state
    console.log("Updated Dirichlet counts after feedback:", updatedTopics.map(t => ({name: t.name, dirichletCount: t.dirichletCount})));
  
    setCompletedProblems(prev => [...prev, currentProblem.problemName]);
    setModalIsOpen(false);
  };
  
  

  return (
    <div className="App">
      <div className="banner-container">
        <div className="banner-content">
          <h1>CS106B Practice Problem Recommender</h1>
          <p>Welcome! Please rank your preferences on what to study:</p>
        </div>
      </div>
      <div className="main-container">
        <div className="leftColumn">
          <Categories topics={topics} onRankChange={handleRankChange} />
          <button
            onClick={handleSubmit}
            style={{
              backgroundColor: '#FFFFFF',
              color: 'black',
              border: '1px solid #D1D1D1',
              borderRadius: '5px',
              padding: '1.5px 8px',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              outline: 'none',
              marginTop: '10px',
            }}
          >
            Submit Rankings
          </button>
        </div>
        <div className="rightColumn">
        {
        recommendedProblems.length > 0 && (
          <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '5px', height: '30px', backgroundColor: '#888888', marginRight: '10px', marginLeft: '-3px' }}></div>
            <h2 style={{ color: 'black', display: 'inline-block', fontWeight: '200px', margin: 0 }}>Recommended Problems</h2>
          </div>
          <button
              onClick={recommendNewProblems}
              style={{
                position: 'absolute',
                backgroundColor: '#FFFFFF',
                color: 'black',
                border: '1px solid #D1D1D1',
                borderRadius: '5px',
                padding: '1.5px 8px',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                outline: 'none',
                marginTop: '750px',
                marginLeft: '14px'
              }}
            >
              Recommend New Problems
            </button>
            <ul>
              {recommendedProblems.map((problem, index) => (
                <li key={index}>
                  <p style={{ color: 'black', marginLeft: '15px' }}><strong>{index + 1}) {problem.name}</strong></p>
                  <p style={{ color: 'black', marginLeft: '15px' }}>Topic: {problem.topic}</p>
                  <p style={{ marginLeft: '15px' }}>
                    <a href={problem.link} target="_blank" rel="noopener noreferrer">
                      Link to {problem.name}
                    </a>
                  </p>
                  <button
                    onClick={() => markAsCompleted(problem.name, problem.topic)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: 'black',
                      border: '1px solid #D1D1D1',
                      borderRadius: '5px',
                      padding: '1.5px 8px',
                      fontSize: '16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      outline: 'none',
                      marginLeft: '15px'
                    }}
                  >
                    {completedProblems.includes(problem.name) ? '✅' : 'Mark as Completed'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      }
        </div>
      </div>
      <Modal
      isOpen={modalIsOpen}
      onRequestClose={() => setModalIsOpen(false)}
      contentLabel="Feedback Modal"
      style={customStyles}  // Apply the custom styles here
    >
      <h2 style={{ color: '#8C1515' }}>Good Work on {currentProblem?.topicId}! ✅</h2>
      <p>On a scale of 1-5, how much more practice on {currentProblem?.topicId} would you like?</p>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
    {[1, 2, 3, 4, 5].map(value => (
      <div key={value} style={{ textAlign: 'center', width: '50px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            type="radio"
            value={value}
            checked={feedback === value}
            onChange={() => setFeedback(value)}
          />
          <span>{value}</span>
        </label>
      </div>
    ))}
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', width: '300px', margin: '0 auto' }}>
    <div style={{ textAlign: 'center' }}>Less</div>
    <div style={{ textAlign: 'center' }}>More</div>
  </div>
      <button onClick={handleFeedbackSubmit}
      style={{
        backgroundColor: '#FFFFFF',
        color: 'black',
        border: '1px solid #D1D1D1',
        borderRadius: '5px',
        padding: '1.5px 8px',
        fontSize: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        outline: 'none',
        marginTop: '10px'
      }}
      >Submit</button>
    </Modal>
    <div className="credit">
  Styling modeled after CS106B website, Spring 2024
</div>

    </div>
  );
}

export default App;
