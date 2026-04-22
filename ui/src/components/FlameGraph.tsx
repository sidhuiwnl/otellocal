

const ROW_H = 22;
const PAD = 3;
const COLORS = ['#333331','#185FA5','#0F6E56','#534AB7','#854F0B','#3B6D11','#A32D2D'];

type Span = {
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  startMs: number;
  durationMs: number;
};

type Trace = {
  traceId: string;
  startMs: number;
  durationMs: number;
  spans?: Span[];
};

type FlameGraphProps = {
  trace: Trace;
};

export default function FlameGraph({ trace }: FlameGraphProps) {
  if (!trace.spans?.length) {
    return <div className="empty-state">loading spans...</div>;
  }

  // depth map: spanId -> depth
  const depthMap: Record<string, number> = {};

  const sorted = [...trace.spans].sort(
    (a, b) => a.startMs - b.startMs
  );

  for (const span of sorted) {
    if (!span.parentSpanId) {
      depthMap[span.spanId] = 0;
    } else {
      depthMap[span.spanId] =
        (depthMap[span.parentSpanId] ?? 0) + 1;
    }
  }

  const totalMs = trace.durationMs || 1;
  const svgW = 700;

  const maxDepth = Math.max(...Object.values(depthMap), 0);

  const svgH =
    (maxDepth + 1) * (ROW_H + PAD) + PAD;

  return (
    <div className="flamegraph">
      <div className="flame-hint">
        wider = longer · stacked by call depth
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", maxWidth: "100%" }}
      >
        {sorted.map((span, i) => {
          const x =
            ((span.startMs - trace.startMs) / totalMs) * svgW;

          const w = Math.max(
            (span.durationMs / totalMs) * svgW,
            2
          );

          const depth = depthMap[span.spanId] ?? 0;

          const y =
            depth * (ROW_H + PAD) + PAD;

          const fill =
            COLORS[i % COLORS.length];

          const label =
            w > 50
              ? span.name.slice(
                  0,
                  Math.floor(w / 7)
                )
              : "";

          return (
            <g key={span.spanId}>
              <rect
                x={x}
                y={y}
                width={w}
                height={ROW_H}
                rx={3}
                fill={fill}
                opacity={0.9}
              />
              {label && (
                <text
                  x={x + 4}
                  y={y + 14}
                  fontSize={11}
                  fill="#fff"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}