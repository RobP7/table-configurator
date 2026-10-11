import { useEffect, useRef, useState } from "react";
import {
  CURRENCY,
  LEG_FINISHES,
  LEG_STYLES,
  SHAPES,
  SIZES,
  TOP_COLORS,
  TOP_RANGES,
} from "../config/options";
import { useConfigStore, usePrice } from "../store/useConfigStore";
import { StepSection } from "./StepSection";
import { OptionCard } from "./OptionCard";
import { SwatchOption } from "./SwatchOption";
import { ShapeIcon } from "./icons/ShapeIcons";
import { LegStyleIcon } from "./icons/LegStyleIcons";

export function ConfiguratorPanel() {
  const {
    shapeId,
    sizeId,
    topRangeId,
    topColorId,
    legStyleId,
    legFinishId,
    legChangeNotice,
    setShape,
    setSize,
    setTopRange,
    setTopColor,
    setLegStyle,
    setLegFinish,
    dismissLegChangeNotice,
  } = useConfigStore();
  const { total, shape, size, topRange, topColor, legStyle, legFinish } = usePrice();
  const legStyleRef = useRef<HTMLDivElement>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (legChangeNotice) {
      legStyleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [legChangeNotice]);

  const handleCheckout = async () => {
    setCheckoutStatus("loading");
    setCheckoutError(null);
    try {
      const apiUrl = import.meta.env.VITE_CHECKOUT_API_URL || "/api/create-draft-order";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shapeId,
          sizeId,
          topRangeId,
          topColorId,
          legStyleId,
          legFinishId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Checkout failed — please try again.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setCheckoutStatus("error");
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed — please try again.");
    }
  };

  const rangesForShape = TOP_RANGES.filter((r) => r.shapeId === shapeId);
  const hasRange = rangesForShape.length > 0 && !!topRange;
  const colorsForRange = topRange ? TOP_COLORS.filter((c) => c.compatibleRanges.includes(topRange.id)) : [];
  const sizesForShape = SIZES.filter((s) => s.shapeId === shapeId);
  const legStylesForSelection = LEG_STYLES.filter(
    (l) =>
      l.compatibleShapes.includes(shapeId) &&
      (!l.compatibleSizes || l.compatibleSizes.includes(sizeId))
  );
  const legFinishesForMaterial = legStyle
    ? LEG_FINISHES.filter(
        (f) =>
          f.material === legStyle.material &&
          (!legStyle.compatibleFinishes || legStyle.compatibleFinishes.includes(f.id))
      )
    : [];
  const WOOD_ICON_COLOR = "#b8875a";
  const steelLegs = legStylesForSelection.filter((l) => l.material === "steel");
  const oakLegs = legStylesForSelection.filter((l) => l.material === "oak");

  return (
    <aside className="panel">
      <div className="panel__header">
        <h1>Table Configurator</h1>
        <p>Design your table exactly the way you want it — shape, size, top and legs.</p>
      </div>

      {legChangeNotice && (
        <div className="panel__notice">
          <span>
            <strong>{legChangeNotice.fromLabel}</strong> isn't available for{" "}
            {legChangeNotice.reasonLabel}, so the leg style was changed to{" "}
            <strong>{legChangeNotice.toLabel}</strong>. Pick a different one below if you'd like.
          </span>
          <button type="button" onClick={dismissLegChangeNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="panel__steps">
        <StepSection index={1} title="Shape" summary={shape.label}>
          <div className="option-grid">
            {SHAPES.map((s) => (
              <OptionCard
                key={s.id}
                label={s.label}
                icon={<ShapeIcon shapeId={s.id} />}
                priceModifier={s.basePrice - SHAPES[0].basePrice}
                selected={s.id === shapeId}
                onSelect={() => setShape(s.id)}
              />
            ))}
          </div>
        </StepSection>

        {hasRange && topRange && topColor && legStyle && legFinish ? (
          <>
            <StepSection index={2} title="Range" summary={topRange.label}>
              <div className="option-grid">
                {rangesForShape.map((r) => (
                  <OptionCard
                    key={r.id}
                    label={r.label}
                    description={r.description}
                    image={r.image}
                    priceModifier={0}
                    selected={r.id === topRangeId}
                    onSelect={() => setTopRange(r.id)}
                  />
                ))}
              </div>
            </StepSection>

            <StepSection index={3} title="Size" summary={size.label}>
              <div className="option-grid">
                {sizesForShape.map((s) => (
                  <OptionCard
                    key={s.id}
                    label={s.label}
                    priceModifier={s.priceModifier}
                    selected={s.id === sizeId}
                    onSelect={() => setSize(s.id)}
                  />
                ))}
              </div>
            </StepSection>

            <StepSection index={4} title="Finish" summary={topColor.label}>
              <div className="swatch-grid">
                {colorsForRange.map((c) => (
                  <SwatchOption
                    key={c.id}
                    label={c.label}
                    color={c.color}
                    image={c.image}
                    priceModifier={c.priceModifier}
                    selected={c.id === topColorId}
                    onSelect={() => setTopColor(c.id)}
                  />
                ))}
              </div>
            </StepSection>

            <StepSection
              ref={legStyleRef}
              index={5}
              title="Leg Style"
              summary={legStyle.label}
              highlighted={!!legChangeNotice}
            >
              {steelLegs.length > 0 && (
                <>
                  <span className="option-subheading">Steel</span>
                  <div className="option-grid option-grid--two-col">
                    {steelLegs.map((l) => (
                      <OptionCard
                        key={l.id}
                        label={l.label}
                        icon={<LegStyleIcon renderStyle={l.renderStyle} />}
                        image={l.image}
                        priceModifier={l.priceModifier}
                        selected={l.id === legStyleId}
                        onSelect={() => setLegStyle(l.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {oakLegs.length > 0 && (
                <>
                  <span className="option-subheading">Wooden (Oak)</span>
                  <div className="option-grid option-grid--two-col">
                    {oakLegs.map((l) => (
                      <OptionCard
                        key={l.id}
                        label={l.label}
                        icon={<LegStyleIcon renderStyle={l.renderStyle} />}
                        iconColor={WOOD_ICON_COLOR}
                        image={l.image}
                        priceModifier={l.priceModifier}
                        selected={l.id === legStyleId}
                        onSelect={() => setLegStyle(l.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </StepSection>

            <StepSection index={6} title="Leg Finish" summary={legFinish.label}>
              <div className="option-grid">
                {legFinishesForMaterial.map((l) => (
                  <OptionCard
                    key={l.id}
                    label={l.label}
                    swatchColor={l.color}
                    priceModifier={l.priceModifier}
                    selected={l.id === legFinishId}
                    onSelect={() => setLegFinish(l.id)}
                  />
                ))}
              </div>
            </StepSection>
          </>
        ) : (
          <div className="panel__coming-soon">
            <p>
              No {shape.label.toLowerCase()} products yet — we're adding the range one table at a
              time. Check back soon.
            </p>
          </div>
        )}
      </div>

      <div className="panel__price-bar">
        {hasRange && total !== null ? (
          <>
            <div className="panel__price-bar-row">
              <div>
                <span className="panel__price-label">Total price</span>
                <span className="panel__price-value">
                  {CURRENCY}
                  {total.toLocaleString("en-GB")}
                </span>
              </div>
              <button
                type="button"
                className="panel__cta"
                onClick={handleCheckout}
                disabled={checkoutStatus === "loading"}
              >
                {checkoutStatus === "loading" ? "Preparing checkout…" : "Checkout"}
              </button>
            </div>
            {checkoutStatus === "error" && checkoutError && (
              <p className="panel__checkout-error">{checkoutError}</p>
            )}
          </>
        ) : (
          <p className="panel__price-bar-note">Select a shape with available products to see pricing.</p>
        )}
      </div>
    </aside>
  );
}
