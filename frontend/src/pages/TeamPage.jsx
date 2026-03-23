import Header from '../components/Header';
import Footer from '../components/Footer';

const TeamPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
          <p className="text-lg font-medium">Team Page</p>
          <p className="text-sm mt-2">More to come soon</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TeamPage;
