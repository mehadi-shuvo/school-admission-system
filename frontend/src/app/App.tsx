import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ReservationProvider } from "../features/holds/context/ReservationContext";
import { ApplicationErrorBoundary } from "../components/feedback/ApplicationErrorBoundary";

export function App() {
  return (
    <ApplicationErrorBoundary>
      <ReservationProvider>
        <RouterProvider router={router} />
      </ReservationProvider>
    </ApplicationErrorBoundary>
  );
}
