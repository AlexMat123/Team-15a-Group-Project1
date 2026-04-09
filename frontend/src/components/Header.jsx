import { Link } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FileCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">QC Checker</span>
          </Link>

          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {user?.name}
                </span>
                {user?.team && (
                  <Link
                    to="/team"
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    My Team
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Dashboard
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Profile
                </Link>

                <Link 
                  to="/settings" 
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Settings
                </Link>

                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  User Login
                </Link>
                <Link
                  to="/login?admin=true"
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Admin Login
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;