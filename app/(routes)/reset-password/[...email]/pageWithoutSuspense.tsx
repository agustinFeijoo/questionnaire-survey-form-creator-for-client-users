"use client";
import React, { Suspense } from "react";
import ResetPassword from "./page";


const ResetPasswordSuspense: React.FC = () => {
  return (
    <Suspense fallback={<div className="text-center ">Loading...</div>}>
      <ResetPassword />
    </Suspense>
  );
};

export default ResetPasswordSuspense;
