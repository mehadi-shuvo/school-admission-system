import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../features/classes/DashboardPage";
import { MyHoldsPage } from "../features/student/MyHoldsPage";
import { NotFoundPage } from "../components/feedback/NotFoundPage";
import { AdminClassesPage } from "../features/admin/AdminClassesPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "my-holds", element: <MyHoldsPage /> },
      { path: "admin/classes", element: <AdminClassesPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
