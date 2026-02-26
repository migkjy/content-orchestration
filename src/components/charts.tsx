const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];

// --- BarChart ---
export function BarChart({
  data,
  height = 200,
  showValues = true,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}) {
  if (data.length === 0) {
    return <EmptyChart message="데이터가 없습니다." />;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(12, Math.min(40, Math.floor(600 / data.length) - 8));
  const svgWidth = data.length * (barWidth + 8) + 40;
  const chartHeight = height - 30;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={svgWidth} height={height} className="min-w-full" viewBox={`0 0 ${svgWidth} ${height}`}>
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (chartHeight - 20);
          const x = 20 + i * (barWidth + 8);
          const y = chartHeight - barH;
          const color = d.color || COLORS[i % COLORS.length];

          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={color} opacity={0.85} />
              {showValues && d.value > 0 && (
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-gray-600 text-[10px]">
                  {d.value}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-gray-500 text-[9px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- MiniLineChart ---
export function MiniLineChart({
  data,
  labels,
  height = 120,
  color = '#3b82f6',
}: {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return <EmptyChart message="데이터가 없습니다." />;
  }

  const maxVal = Math.max(...data, 1);
  const padding = 20;
  const chartW = Math.max(200, data.length * 30);
  const chartH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (chartW - padding * 2);
    const y = padding + chartH - (v / maxVal) * chartH;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${padding + chartH}`,
    ...points,
    `${padding + (chartW - padding * 2)},${padding + chartH}`,
  ].join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartW} height={height} viewBox={`0 0 ${chartW} ${height}`} className="min-w-full">
        <polygon points={areaPoints} fill={color} opacity={0.1} />
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (chartW - padding * 2);
          const y = padding + chartH - (v / maxVal) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill={color} />
              {labels && labels[i] && (
                <text x={x} y={height - 2} textAnchor="middle" className="fill-gray-400 text-[9px]">
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- DonutChart ---
export function DonutChart({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <EmptyChart message="데이터가 없습니다." />;
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const strokeWidth = radius * 0.35;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((d, i) => {
            const pct = d.value / total;
            const dashLen = pct * circumference;
            const dashGap = circumference - dashLen;
            const currentOffset = offset;
            offset += dashLen;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${dashGap}`}
                strokeDashoffset={-currentOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={0.85}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{total}</p>
            <p className="text-[10px] text-gray-400">total</p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-medium text-gray-800 ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-sm text-gray-400">
      {message}
    </div>
  );
}
