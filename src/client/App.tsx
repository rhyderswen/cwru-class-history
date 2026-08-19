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
import { SearchPageProvider } from "./contexts/searchPageContext";
import { URLParamProvider } from "./contexts/urlParamContext";

function Layout() {
  return (
    <URLParamProvider>
      <Topbar>
        <Outlet />
      </Topbar>
    </URLParamProvider>
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
            element: (
              <SearchPageProvider>
                <Search />
              </SearchPageProvider>
            ),
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
