"use client"
import { Suspense } from "react";
import Spinner from "./components/Spinner";
import PageWithoutSuspense from "./pageWithoutSuspense"; // Make sure to import correctly


export default function Home() {
  return (
    <Suspense fallback={<Spinner />}>
      <PageWithoutSuspense />
    </Suspense>
  );
}
