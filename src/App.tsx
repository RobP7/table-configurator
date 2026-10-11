import { Scene } from "./three/Scene";
import { ConfiguratorPanel } from "./components/ConfiguratorPanel";
import { useConfigStore } from "./store/useConfigStore";
import "./App.css";

function App() {
  const hasProduct = useConfigStore((s) => !!s.topRangeId);

  return (
    <div className="app">
      <div className="app__viewer">
        {hasProduct ? (
          <>
            <Scene />
            <div className="app__hint">Drag to rotate · Scroll to zoom</div>
          </>
        ) : (
          <div className="app__empty">
            <p>No product to preview yet for this shape — check back soon.</p>
          </div>
        )}
      </div>
      <ConfiguratorPanel />
    </div>
  );
}

export default App;
