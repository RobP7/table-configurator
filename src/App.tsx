import { Scene } from "./three/Scene";
import { ConfiguratorPanel } from "./components/ConfiguratorPanel";
import { RealPhotoGallery } from "./components/RealPhotoGallery";
import { useConfigStore, usePrice } from "./store/useConfigStore";
import { CURRENCY, TOP_RANGES } from "./config/options";
import "./App.css";

function App() {
  const hasProduct = useConfigStore((s) => !!s.topRangeId);
  const topRangeId = useConfigStore((s) => s.topRangeId);
  const topRange = TOP_RANGES.find((r) => r.id === topRangeId);
  const { total, legStyle } = usePrice();
  // A leg with its own photos shows those; otherwise fall back to the
  // range's default gallery and say it's illustrative.
  const legGallery = legStyle ? topRange?.legGalleries?.[legStyle.id] : undefined;
  const illustrative = !!topRange?.legGalleries && !legGallery && !!legStyle;
  // For a leg with no photos on this table, show the range's photos plus the
  // chosen leg's own product photo.
  const gallery = legGallery
    ? legGallery
    : topRange?.photoGallery
      ? illustrative && legStyle?.image
        ? [...topRange.photoGallery, legStyle.image]
        : topRange.photoGallery
      : undefined;

  return (
    <div className="app">
      <div className="app__viewer">
        {hasProduct ? (
          <>
            <div className="app__canvas">
              {topRange && gallery ? (
                <RealPhotoGallery
                  key={gallery.join("|")}
                  images={gallery}
                  label={topRange.label}
                  note={
                    illustrative
                      ? `Photos shown are for illustration — photos with the ${legStyle!.label} are coming soon.`
                      : undefined
                  }
                />
              ) : (
                <>
                  <Scene />
                  <div className="app__hint">Drag to rotate · Scroll to zoom</div>
                </>
              )}
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
