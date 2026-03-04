import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, changePassword, isAuthenticated } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.mustChangePassword) {
    const redirectPath = user?.role === 'user' ? '/dashboard' : '/admin';
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await changePassword(null, newPassword);
      
      if (user?.role === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Change Your Password
          </h2>
          <p className="text-center text-gray-600 mb-6">
            You must set a new password before continuing
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Enter new password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Confirm new password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
            <p className="font-semibold mb-1">Password Requirements:</p>
            <p>• At least 6 characters</p>
            <p>• Choose a strong, unique password</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ChangePassword;
