"use client";
import BranchOperations from "@/components/BranchOperations";
import { useAuth } from "@/components/AuthProvider";

export default function BranchOperationsPage() {
  const { member } = useAuth();
  return <BranchOperations key={member?.no} />;
}
