import { isRouteErrorResponse, Link, useRouteError } from "react-router";

/** The page rendered if React recieves any error that causes the previous page to crash. */
export default function ErrorPage() {
  const error = useRouteError();
  console.log(error);

  // Handle route errors with status codes
  if (isRouteErrorResponse(error)) {
    return (
      <div className="errorPage">
        <h1 style={{ marginTop: 0 }}>
          {error.status} - {error.statusText || error.data}
        </h1>
        {error.status === 404 && <p>The resource you're looking for doesn't exist.</p>}
        <Link to="/">Go Home</Link>
      </div>
    );
  }

  // Fallback for unexpected errors
  return (
    <div className="errorPage">
      <h1>Oops! Something went wrong.</h1>
    </div>
  );
}
