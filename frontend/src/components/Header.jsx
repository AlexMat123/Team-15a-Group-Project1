import { Link } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <Link to="/" className="flex items-center space-x-2 self-start">
            <FileCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">QC Checker</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 sm:justify-end">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {user?.name}
                </span>
                <Link
                  to="/how-it-works"
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  How It Works
                </Link>
                {user?.team && (
                  <Link
                    to="/team"
                    className="text-sm text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-gray-900"
                  >
                    My Team
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-sm text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-gray-900"
                  >
                    Dashboard
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  Profile
                </Link>

                <Link 
                  to="/settings" 
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  Settings
                </Link>

                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/how-it-works"
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  How It Works
                </Link>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                >
                  User Login
                </Link>
                <Link
                  to="/login?admin=true"
                  className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
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
