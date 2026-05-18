import { authApi } from '@/lib/api'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm shadow-sm">
        <img src="/logo.png" alt="Pacific Liberty Law" className="h-16 object-contain" />
        <div className="text-center">
          <p className="text-sm text-gray-500">Email Classification System</p>
        </div>
        <button
          onClick={() => authApi.login()}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </button>
        <p className="text-xs text-gray-400 text-center">
          Sign in with your Outlook account to access<br />your firm's email classification system
        </p>
      </div>
    </div>
  )
}
