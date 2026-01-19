
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Profile Settings</h1>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold">Name</label>
        <div className="p-2 border rounded bg-gray-50">{user?.name || 'N/A'}</div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold">Email</label>
        <div className="p-2 border rounded bg-gray-50">{user?.email || 'N/A'}</div>
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 font-semibold mb-2">Password</label>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => router.push('/reset-user-data')}
        >
          Forgot Password
        </button>
      </div>
    </div>
  );
}
