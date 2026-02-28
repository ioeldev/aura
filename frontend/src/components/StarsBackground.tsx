import { useMemo } from "react";

// Positions fixes pour un effet de mini-étoiles (répétables)
const STAR_POSITIONS = [
    [2, 5], [15, 12], [28, 3], [41, 18], [55, 8], [67, 22], [80, 4], [93, 15],
    [7, 25], [22, 32], [35, 28], [48, 38], [62, 31], [75, 42], [88, 29], [5, 45],
    [18, 52], [31, 48], [44, 58], [57, 51], [70, 62], [83, 49], [96, 55], [12, 68],
    [25, 75], [38, 71], [51, 82], [64, 76], [77, 88], [90, 72], [3, 85], [19, 92],
    [33, 87], [46, 95], [59, 91], [72, 8], [85, 17], [98, 11], [11, 3], [24, 19],
    [37, 7], [50, 24], [63, 13], [76, 30], [89, 6], [6, 35], [20, 41], [34, 36],
    [47, 47], [60, 40], [73, 52], [86, 44], [99, 39], [9, 60], [23, 67], [36, 63],
    [49, 73], [53, 56], [66, 69], [79, 61], [92, 75], [4, 78], [17, 84], [30, 80],
    [43, 90], [56, 83], [69, 94], [82, 79], [95, 86], [8, 2], [21, 14], [39, 9],
    [52, 26], [65, 16], [78, 33], [91, 21], [14, 44], [27, 50], [40, 46], [54, 59],
];

function StarFieldSvg({ className }: { className?: string }) {
    const stars = useMemo(
        () =>
            STAR_POSITIONS.map(([x, y], i) => (
                <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={i % 4 === 0 ? 0.6 : 0.3}
                    fill="currentColor"
                />
            )),
        []
    );

    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <pattern id="stars-bg" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    {stars}
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stars-bg)" />
        </svg>
    );
}

export function StarsBackground() {
    return (
        <div
            className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background"
            aria-hidden
        >
            <StarFieldSvg className="absolute inset-0 w-full h-full text-blue-900/30 dark:text-blue-50/30" />
        </div>
    );
}
