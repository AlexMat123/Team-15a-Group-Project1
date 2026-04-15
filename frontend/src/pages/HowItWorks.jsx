import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileSearch,
  Settings2,
  Shield,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import getDefaultRouteByRole from '../utils/getDefaultRouteByRole';

const overviewPoints = [
  'Upload a QC report PDF and let the system process it for you.',
  'Review grouped errors, pass or fail outcomes, and time saved.',
  'Track reports across personal, team, or admin views depending on your role.',
];

const features = [
  {
    title: 'PDF report upload',
    description: 'Users can submit QC report PDFs from the dashboard and monitor upload progress and report status.',
    icon: Upload,
  },
  {
    title: 'Automatic error detection',
    description: 'The app checks for placeholder, consistency, compliance, formatting, and missing data issues.',
    icon: FileCheck,
  },
  {
    title: 'Detailed report review',
    description: 'Each analysed report shows grouped findings, issue counts, result labels, and a downloadable report file.',
    icon: FileSearch,
  },
  {
    title: 'Team collaboration',
    description: 'Team members can view shared progress, while team leads can manage members, goals, and announcements.',
    icon: Users,
  },
  {
    title: 'Admin analytics',
    description: 'Admins can review wider trends, user activity, report outcomes, and company-level quality metrics.',
    icon: BarChart3,
  },
  {
    title: 'Account and accessibility settings',
    description: 'Users can update their profile, notifications, display settings, contrast, font size, and data preferences.',
    icon: Settings2,
  },
];

const reportSteps = [
  {
    title: 'Sign in and open your dashboard',
    description: 'Regular users land on the dashboard after sign-in. Admins go to the admin dashboard instead.',
    column: 'right',
  },
  {
    title: 'Upload a PDF report',
    description: 'Choose a PDF or drag and drop it into the upload area. The file is added to your reports list straight away.',
    column: 'left',
  },
  {
    title: 'Wait for processing',
    description: 'Reports move through pending or processing states until the analysis is complete.',
    column: 'right',
  },
  {
    title: 'Open the finished report',
    description: 'Use the report detail page to inspect grouped issues, location hints, suggestions, and the final result.',
    column: 'left',
  },
  {
    title: 'Download or act on the result',
    description: 'Download the generated output, fix issues in the source document, and re-upload a revised report if needed.',
    column: 'right',
  },
  {
    title: 'Review admin analytics',
    description: 'Admins can open the admin dashboard to review platform activity, report trends, user management, and wider quality metrics.',
    column: 'right',
  },
];

const teamTasks = [
  'Team members can view their team area and follow shared progress.',
  'Team leads can add or remove members, set goals, and post announcements.',
  'Admins can compare users or teams, inspect trends, and manage users at platform level.',
];

const resultMeaning = [
  {
    label: 'Pending or Processing',
    description: 'The file has been received and is still being analysed.',
    icon: Eye,
  },
  {
    label: 'Analysed',
    description: 'The review is complete and the report detail page is ready to open.',
    icon: CheckCircle2,
  },
  {
    label: 'Passed, Failed, or Uncertain',
    description: 'These result labels summarise the quality assessment after analysis.',
    icon: Shield,
  },
  {
    label: 'Downloadable output',
    description: 'Completed reports can be downloaded from the dashboard or report detail page.',
    icon: Download,
  },
];

const supportTips = [
  'Use the dashboard if you want to upload and review your own reports.',
  'Use the team page if you need team analytics, goals, or announcements.',
  'Use settings if you want to adjust notifications, contrast, motion, or font size.',
  'Use the admin area only if your account has admin access.',
];

const HowItWorks = () => {
  const { isAuthenticated, user } = useAuth();

  const workspaceLink = user?.mustChangePassword
    ? '/change-password'
    : getDefaultRouteByRole(user?.role);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <a
        href="#how-it-works-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow"
      >
        Skip to content
      </a>
      <Header />

      <main id="how-it-works-content" className="flex-1">
        <section aria-labelledby="how-it-works-heading" className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start">
              <div className="max-w-3xl">
                <h1 id="how-it-works-heading" className="mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                  How QC Checker works
                </h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                  QC Checker helps teams upload construction QC reports, detect likely issues automatically, and review results in one place.
                </p>
                <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
                  This page is for first-time users who want a simple explanation of what the app does, what features are available, and how to complete the most common tasks.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={isAuthenticated ? workspaceLink : '/login'}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    {isAuthenticated ? 'Open workspace' : 'Sign in to start'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      to="/login?admin=true"
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
                    >
                      Admin sign in
                    </Link>
                  )}
                </div>
              </div>

              <aside className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:mt-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">At a glance</h2>
                <ul className="mt-4 space-y-4">
                  {overviewPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-indigo-600 dark:text-indigo-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-heading" className="bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
            <div className="max-w-3xl">
              <h2 id="features-heading" className="text-3xl font-bold text-gray-900 dark:text-white">Main features</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                These are the main parts of the app that most users will interact with.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-gray-800"
                >
                  <div className="inline-flex rounded-xl bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="common-tasks" aria-labelledby="common-tasks-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div>
            <h2 id="common-tasks-heading" className="text-3xl font-bold text-gray-900 dark:text-white">Common task: check a report</h2>
            <p className="mt-3 max-w-3xl text-gray-600 dark:text-gray-300">
              For most users, the main workflow is uploading a report and reviewing the analysis result.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role-based tasks</h3>
                  <ul className="mt-5 space-y-4">
                    {teamTasks.map((task) => (
                      <li key={task} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                        <Users className="mt-0.5 h-4 w-4 flex-none text-indigo-600 dark:text-indigo-300" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                {reportSteps
                  .filter((step) => step.column === 'left')
                  .map(({ title, description }) => (
                    <article
                      key={title}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                      <p className="mt-1 text-gray-600 dark:text-gray-300">{description}</p>
                    </article>
                  ))}
              </div>

              <div className="space-y-6">
                {reportSteps
                  .filter((step) => step.column === 'right')
                  .map(({ title, description }) => (
                    <article
                      key={title}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                      <p className="mt-1 text-gray-600 dark:text-gray-300">{description}</p>
                    </article>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section id="results" aria-labelledby="results-heading" className="bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
            <div className="max-w-3xl">
              <h2 id="results-heading" className="text-3xl font-bold text-gray-900 dark:text-white">How to read the results</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                After a file has been analysed, the app shows status information, error counts, grouped findings, and an overall result label.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {resultMeaning.map(({ label, description, icon: Icon }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-gray-800"
                >
                  <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="help" aria-labelledby="help-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div>
            <h2 id="help-heading" className="text-3xl font-bold text-gray-900 dark:text-white">Useful things to know</h2>
            <ul className="mt-6 space-y-4">
              {supportTips.map((tip) => (
                <li key={tip} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                  <Bell className="mt-0.5 h-5 w-5 flex-none text-indigo-600 dark:text-indigo-300" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
