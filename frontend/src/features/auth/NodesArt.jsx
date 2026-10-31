// Nodos y lineas conectadas, decorativo (SVG propio, sin estilos en linea para
// respetar la CSP).
const NODES = [
  [60, 80],
  [180, 40],
  [300, 110],
  [120, 190],
  [250, 230],
  [370, 200],
  [80, 310],
  [210, 340],
  [340, 320],
];
const LINKS = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [2, 5],
  [3, 4],
  [4, 5],
  [3, 6],
  [4, 7],
  [5, 8],
  [6, 7],
  [7, 8],
];

export default function NodesArt({ className = '' }) {
  return (
    <svg viewBox="0 0 420 380" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="linea-marca" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d00de3" />
          <stop offset="0.5" stopColor="#6941f4" />
          <stop offset="1" stopColor="#1de5e9" />
        </linearGradient>
        <radialGradient id="esfera-marca" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ebe3fe" />
          <stop offset="0.45" stopColor="#6941f4" />
          <stop offset="1" stopColor="#1a0b3f" />
        </radialGradient>
      </defs>
      {LINKS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          stroke="url(#linea-marca)"
          strokeWidth="1"
          strokeOpacity="0.55"
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 11 : 7} fill="url(#esfera-marca)" />
      ))}
    </svg>
  );
}
