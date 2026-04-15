import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileCheck, Shield, Upload, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const steps = [
  {
    title: 'Upload your report',
    description: 'Sign in, open your workspace, and upload a QC report PDF for automated review.',
    icon: Upload,
  },
  {
    title: 'Let the app analyse it',
    description: 'QC Checker scans the file for formatting issues, missing information, and likely quality concerns.',
    icon: FileCheck,
  },
  {
    title: 'Review the results',
    description: 'Open the generated report, inspect flagged issues, and track progress across your team or admin dashboard.',
    icon: BarChart3,
  },
];

const highlights = [
  {
    title: 'Clear upload workflow',
    description: 'Users can submit PDF reports and monitor their processing status from one place.',
    icon: Upload,
  },
  {
    title: 'Team visibility',
    description: 'Team members and leads can stay aligned on reports, outcomes, and ownership.',
    icon: Users,
  },
  {
    title: 'Admin oversight',
    description: 'Administrators can review usage, analytics, and wider quality trends across the platform.',
    icon: Shield,
  },
];

const HowItWorks = () => {
  const { isAuthenticated, user } = useAuth();

  const workspaceLink = user?.mustChangePassword
    ? '/change-password'
    : user?.role === 'admin'
      ? '/admin'
      : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="flex-1">
        <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                Public guide
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                How QC Checker works
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                This page gives first-time users a quick overview of what the app does, how reports move through the system, and where to go next.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={isAuthenticated ? workspaceLink : '/login'}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  {isAuthenticated ? 'Open workspace' : 'Sign in to start'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/login?admin=true"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Admin sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="overview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="inline-flex rounded-xl bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="steps" className="bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Three-step flow</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                New users can understand the core experience quickly: upload, analyse, review.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {steps.map(({ title, description, icon: Icon }, index) => (
                <article
                  key={title}
                  className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                      Step {index + 1}
                    </span>
                    <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
