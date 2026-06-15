import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import litCss from "rollup-plugin-lit-css";

const dev = process.env.ROLLUP_WATCH;

const plugins = [
    // 1. Convert SCSS to Lit CSS Results
    litCss({
        include: ["**/*.scss"],
        uglify: !dev,
    }),

    // 2. Compile TypeScript
    typescript({
        tsconfig: "./tsconfig.json",
    }),

    // 3. Resolve node modules
    nodeResolve({
        browser: true,
    }),

    // 4. Handle CommonJS modules
    commonjs(),

    // 5. Parse JSON
    json(),

    // 6. Transpile with Babel for broader compatibility
    babel({
        exclude: "node_modules/**",
    }),

    // 7. Minify for production
    !dev && terser(),
];

export default [
    {
        input: "src/kodi-playlist-card.ts",
        output: {
            dir: "dist",
            format: "es",
            entryFileNames: "kodi-playlist-card.js",
        },
        plugins: [...plugins],
    },
];