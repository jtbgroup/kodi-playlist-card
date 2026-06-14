import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import serve from "rollup-plugin-serve";
import json from "@rollup/plugin-json";

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
            // 1. Compile TypeScript directly to ES2022
            typescript({
                tsconfig: "./tsconfig.json",
            }),

            // 2. Resolve external dependencies within node_modules
            nodeResolve({
                browser: true,
            }),

            // 3. Convert legacy modules to native ES Module formats
            commonjs(),
            json(),
            
            // NOTE: Babel is intentionally omitted to prevent "invalid template strings array" compilation errors with Lit 2+.
            
            // 4. Stand up the local static preview server
            serve(serveopts),
        ],
    },
];