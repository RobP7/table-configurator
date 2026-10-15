import { Scene } from "./three/Scene";
import { ConfiguratorPanel } from "./components/ConfiguratorPanel";
import { useConfigStore, usePrice } from "./store/useConfigStore";
import { CURRENCY } from "./config/options";
import "./App.css";

function App() {
  const hasProduct = useConfigStore((s) => !!s.topRangeId);
  const { total } = usePrice();

  return (
    <div className="app">
      <div className="app__viewer">
        {hasProduct ? (
          <>
            <div className="app__canvas">
              <Scene />
              <div className="app__hint">Drag to rotate · Scroll to zoom</div>
            </div>
            {total !== null && (
              <div className="app__total">
                <span className="app__total-label">Total price</span>
                <span className="app__total-value">
                  {CURRENCY}
                  {total.toLocaleString("en-GB")}
                </span>
              </div>
            )}
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
