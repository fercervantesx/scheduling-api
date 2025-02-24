interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Scheduling Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please log in to access the dashboard
          </p>
        </div>
        <div className="mt-8 bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10">
          <div className="flex justify-center">
            <button
              onClick={onLogin}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Log in with Auth0
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 