import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import serve from "rollup-plugin-serve";
import json from "@rollup/plugin-json";
import litCss from "rollup-plugin-lit-css";

const serveopts = {
    contentBase: ["./dist"],
    host: "0.0.0.0",
    port: 5000,
    allowCrossOrigin: true,
    headers: {
        "Access-Control-Allow-Origin": "*",
    },
};

export default [
    {
        input: "src/kodi-playlist-card.ts",
        output: {
            dir: "dist",
            format: "es",
            entryFileNames: "kodi-playlist-card.js",
        },
        plugins: [
            // 1. Convert SCSS to Lit CSS Results
            litCss({
                include: ["**/*.scss"],
                uglify: false,
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

            // 6. Serve locally for development
            serve(serveopts),
        ],
    },
];