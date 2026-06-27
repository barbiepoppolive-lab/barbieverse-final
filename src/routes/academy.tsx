import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/academy")({
  component: AcademyLayout,
});

function AcademyLayout() {
  return <Outlet />;
}
