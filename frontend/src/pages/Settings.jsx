import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Moon, Sun, Contrast, Type, Sparkles } from 'lucide-react';

const Settings = () => {
  const [theme, setTheme] = useState('light');
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = () => {
    setSuccessMessage('Settings saved for this session.');
    window.setTimeout(() => setSuccessMessage(''), 2500);
  };

  const toggleClasses = (enabled) =>
    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled ? 'bg-indigo-600' : 'bg-gray-300'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage display and accessibility preferences for your account.
          </p>

          <div className="mt-8 space-y-6">
            <section className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Theme</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose how the interface appears while using the report system.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      theme === 'light'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Sun className="w-4 h-4 inline mr-1" />
                    Light
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Moon className="w-4 h-4 inline mr-1" />
                    Dark
                  </button>
                </div>
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Contrast className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">High Contrast</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Increase contrast to make text and controls easier to distinguish.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={highContrast}
                  onClick={() => setHighContrast(!highContrast)}
                  className={toggleClasses(highContrast)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      highContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Type className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Larger Text</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Increase text size for easier reading across pages.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={largeText}
                  onClick={() => setLargeText(!largeText)}
                  className={toggleClasses(largeText)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      largeText ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Reduced Motion</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Minimise animations and transitions throughout the interface.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={reducedMotion}
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={toggleClasses(reducedMotion)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      reducedMotion ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </section>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Save Preferences
            </button>

            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;