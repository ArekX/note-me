import { useSignal } from "@preact/signals";
import Counter from "../islands/Counter.tsx";

export default function Login() {
  const username = useSignal("");
  const password = useSignal("");

  return (
    <div class="flex items-center justify-center h-screen">
      <form class="bg-white shadow-md rounded px-10 pt-6 pb-8 mb-4">
        <h1 class="mb-5 text-lg">Please Login</h1>
        <div class="mb-5">
          <label
            class="block text-gray-700 text-sm font-bold mb-2"
            for="username"
          >
            Username
          </label>
          <input
            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="username"
            type="text"
            placeholder="Username"
            value={username.value}
          />
        </div>
        <div class="mb-5">
          <label
            class="block text-gray-700 text-sm font-bold mb-2"
            for="password"
          >
            Password
          </label>
          <input
            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            placeholder="Password"
            value={password.value}
          />
        </div>
        <div class="flex items-center justify-center">
          <button
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            LogIn
          </button>
        </div>
      </form>
    </div>
  );
}
