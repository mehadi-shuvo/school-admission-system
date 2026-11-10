import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ReservationProvider } from "../features/holds/context/ReservationContext";

export function App() {
  return (
    <ReservationProvider>
      <RouterProvider router={router} />
    </ReservationProvider>
  );
}
