"use client";

import BranchAdminAssignments from "@/components/BranchAdminAssignments";
import { useAuth } from "@/components/AuthProvider";

export default function AssignedBranchesPage() {
  const { member } = useAuth();
  return <BranchAdminAssignments key={member?.no} />;
}
