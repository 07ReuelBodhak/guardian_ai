import Link from 'next/link';

export default function DiscordSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8">
      <div className="bg-indigo-500/10 p-6 rounded-full mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-4">Bot Successfully Installed!</h1>
      <p className="text-zinc-400 max-w-md mb-8">
        Guardian AI is now active in your Discord server. You can close this window or return to your dashboard to generate your connection code.
      </p>
      <Link 
        href="/dashboard/connections" 
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
      >
        Return to Connections
      </Link>
    </div>
  );
}
