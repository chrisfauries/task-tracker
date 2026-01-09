import React from "react";

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100" style={{ fontFamily: "Georgia, serif" }}>
          <img
          src="/logo.png"
          alt="Because Band Logo"
          className="h-10 w-auto object-contain"
        />
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Because Band Board</h1>
      <button 
        onClick={onLogin} 
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-lg"
      >
        Sign in with Google
      </button>
    </div>
  );
};