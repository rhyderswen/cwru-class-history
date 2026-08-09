import "./App.css";

import { useState } from "react";

function App() {
  const [text, setText] = useState("Nothing yet...");

  return (
    <div className="App">
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() =>
            fetch("/hello")
              .then((res) => res.text())
              .then((text) => {
                console.log(text);
                setText(text);
              })
          }
        >
          {text}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </div>
  );
}

export default App;
