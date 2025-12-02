"use client"
import { Suspense } from "react";

import SignUpPage from "./pageWithoutSuspense"; // Make sure to import correctly
import Spinner from "@/app/components/Spinner";


export default function SignUp() {
  return (
    <Suspense fallback={<Spinner />}>
      <SignUpPage />
    </Suspense>
  );
}


