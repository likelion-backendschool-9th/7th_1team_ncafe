import type { Metadata } from "next";
import BranchAdmin from "./_components/BranchAdmin";

export const metadata: Metadata = { title: "지점 관리" };

export default function AdminBranchesPage() {
  return <BranchAdmin />;
}
