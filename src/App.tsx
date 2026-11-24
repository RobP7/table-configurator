import { Scene } from "./three/Scene";
import { ConfiguratorPanel } from "./components/ConfiguratorPanel";
import { RealPhotoGallery } from "./components/RealPhotoGallery";
import { TableViewer3D } from "./three/tables3d/TableViewer3D";
import { MODEL_FACTORIES, MODEL_LEGS } from "./three/tables3d/models";
import { useConfigStore, usePrice } from "./store/useConfigStore";
import { CURRENCY, LEG_STYLES, TOP_RANGES } from "./config/options";
import "./App.css";

function App() {
  const hasProduct = useConfigStore((s) => !!s.topRangeId);
  const topRangeId = useConfigStore((s) => s.topRangeId);
  const topRange = TOP_RANGES.find((r) => r.id === topRangeId);
  const { total, legStyle, size } = usePrice();
  // Ranges with a real 3D model. Others keep their photo gallery (or the older generic 3D scene).
  const has3D = !!topRangeId && topRangeId in MODEL_FACTORIES;
  const modelLegs = (topRangeId && MODEL_LEGS[topRangeId]) || [];
  const legHasModel = !!legStyle && modelLegs.includes(legStyle.id);
  const fallbackLeg = LEG_STYLES.find((l) => l.id === modelLegs[0]);
  const note3D =
    has3D && legStyle && !legHasModel
      ? `3D view of the ${legStyle.label} is coming soon — showing the ${fallbackLeg?.label ?? "standard base"}.`
      : undefined;
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
              {has3D && topRangeId ? (
                <TableViewer3D
                  key={topRangeId}
                  rangeId={topRangeId}
                  lengthCm={size.length}
                  legId={legHasModel ? legStyle!.id : (modelLegs[0] ?? null)}
                  note={note3D}
                />
              ) : topRange && gallery ? (
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
