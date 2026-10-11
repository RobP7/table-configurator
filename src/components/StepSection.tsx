import { forwardRef, type ReactNode } from "react";

interface StepSectionProps {
  index: number;
  title: string;
  summary: string;
  highlighted?: boolean;
  children: ReactNode;
}

export const StepSection = forwardRef<HTMLDivElement, StepSectionProps>(function StepSection(
  { index, title, summary, highlighted, children },
  ref
) {
  return (
    <div ref={ref} className={`step-section${highlighted ? " step-section--highlighted" : ""}`}>
      <div className="step-section__header">
        <span className="step-section__index">{index}</span>
        <span className="step-section__title-wrap">
          <span className="step-section__title">{title}</span>
          <span className="step-section__summary">{summary}</span>
        </span>
      </div>
      <div className="step-section__content">{children}</div>
    </div>
  );
});
