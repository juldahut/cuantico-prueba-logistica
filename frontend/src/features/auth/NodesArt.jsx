// Red de nodos y esferas luminosas, decorativa. SVG propio y animaciones solo
// CSS (sin estilos en linea, por la CSP): los enlaces "fluyen", los nodos
// pulsan con un halo y toda la red flota despacio.
const NODES = [
  [90, 110, 12],
  [250, 60, 8],
  [430, 140, 14],
  [150, 260, 9],
  [320, 300, 16],
  [510, 280, 8],
  [70, 430, 8],
  [230, 470, 12],
  [400, 500, 9],
  [540, 440, 13],
  [150, 620, 14],
  [330, 650, 8],
  [500, 640, 10],
];
const LINKS = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [2, 4],
  [2, 5],
  [3, 4],
  [4, 5],
  [3, 6],
  [3, 7],
  [4, 7],
  [4, 8],
  [5, 9],
  [8, 9],
  [6, 7],
  [7, 8],
  [7, 10],
  [8, 11],
  [9, 12],
  [10, 11],
  [11, 12],
];

export default function NodesArt({ className = '' }) {
  return (
    <svg
      viewBox="0 0 600 720"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="linea-marca" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d00de3" />
          <stop offset="0.5" stopColor="#6941f4" />
          <stop offset="1" stopColor="#1de5e9" />
        </linearGradient>
        <radialGradient id="esfera-marca" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ebe3fe" />
          <stop offset="0.45" stopColor="#8a63ff" />
          <stop offset="1" stopColor="#1a0b3f" />
        </radialGradient>
        <radialGradient id="halo-marca" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c6a5ff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#6941f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="red-flota">
        {LINKS.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            className="enlace-flujo"
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
            stroke="url(#linea-marca)"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
        ))}
        <g className="nodos">
          {NODES.map(([x, y, r], i) => (
            <circle
              key={`h${i}`}
              className="halo"
              cx={x}
              cy={y}
              r={r * 3}
              fill="url(#halo-marca)"
            />
          ))}
        </g>
        <g className="nodos">
          {NODES.map(([x, y, r], i) => (
            <circle key={i} className="nodo" cx={x} cy={y} r={r} fill="url(#esfera-marca)" />
          ))}
        </g>
      </g>
    </svg>
  );
}
