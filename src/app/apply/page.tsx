'use client';

import { useState } from 'react';

export default function ApplyPage() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitApplication() {
    if (!studentId || !studentName) {
      alert("Please enter both Student ID and Name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/student-apply', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          student_id: studentId.trim(), 
          student_name: studentName.trim() 
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert("Application submitted successfully!");
        setStudentId('');
        setStudentName('');
      } else {
        alert(data.message || "Failed to submit application.");
      }
    } catch (err) {
      alert("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      {/* This structure matches your index.txt Apply Section exactly */}
      <div className="card">
        <div className="section-title">
          <i className="material-icons">assignment</i>
          <h3>Apply for Training Program</h3>
        </div>
        
        <p>Enter your official university details to register for the training program.</p>
        
        <div className="grid-2">
          <input 
            type="text" 
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
        </div>
        
        <button 
          className="actionBtn" 
          onClick={submitApplication}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
}