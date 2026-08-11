import Topbar from "@/components/Topbar";
import Error from "@/pages/Error";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import {
  createBrowserRouter,
  LoaderFunctionArgs,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import "./App.css";

function Layout() {
  return (
    <Topbar>
      <Outlet />
    </Topbar>
  );
}

function departmentLoader({ params }: LoaderFunctionArgs) {
  // returns a 404 if it isn't 4 characters and alphabetic
  const { department } = params;
  if (!department || !/^[a-zA-Z]{4}$/.test(department)) {
    throw new Response("Not Found", { status: 404 });
  }
  return { department };
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/search",
        children: [
          {
            index: true, // matches exactly /schedule
            element: <Navigate to="/" replace />,
          },
          {
            path: ":department", // matches /schedule/:department
            element: <Search />,
            loader: departmentLoader,
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
