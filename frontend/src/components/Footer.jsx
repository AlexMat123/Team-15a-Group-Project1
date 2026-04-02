import { FileCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FileCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span className="text-lg font-bold">QC Checker</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI-powered quality control report analysis for the construction industry.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Features</a></li>
              <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>support@qcchecker.com</li>
              <li>+44 123 456 7890</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} QC Checker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;