import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TeamPage = () => {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/teams/my-team', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeam(res.data);
      } catch (err) {
        console.error('Failed to load team:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <p className="text-gray-400 text-lg text-center animate-pulse">Loading team...</p>
        ) : !team ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            <p className="text-lg font-medium">You are not part of any team.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-600">Team Page</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {showMembers ? 'Hide Members' : 'View Members'}
                <span className={`transition-transform ${showMembers ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showMembers && (
                <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {team.members.map(m => (
                    <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="bg-indigo-100 text-indigo-600 rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold">
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.role === 'team_leader'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.role === 'team_leader' ? 'Team Leader' : 'User'}
                      </span>
                      {team.teamLead && (team.teamLead._id === m._id || team.teamLead === m._id) && (
                        <span className="text-xs font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          Lead
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TeamPage;
