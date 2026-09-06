"use client";
import dynamic from 'next/dynamic';

const AuthScreen = dynamic(() => import("../../components/AuthScreen"), { ssr: false });

export default function SignupPage() {
  return <AuthScreen defaultMode="signup" />;
}
