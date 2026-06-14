import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import terser from "@rollup/plugin-terser";
import serve from "rollup-plugin-serve";
import json from "@rollup/plugin-json";
import litCss from "rollup-plugin-lit-css";
import { string } from "rollup-plugin-string"; // 🔥 Import the string loader

const dev = process.env.ROLLUP_WATCH;

const serveopts = {
    contentBase: ["./dist"],
    host: "0.0.0.0",
    port: 5000,
    allowCrossOrigin: true,
    headers: {
        "Access-Control-Allow-Origin": "*",
    },
};

const plugins = [
    // 1. Intercept asset files FIRST and turn them into JS-readable formats
    string({
        include: "**/*.html", // 📦 Loads your .html template as a plain text string
    }),
    litCss({
        include: ["**/*.scss", "**/*.css"], // 🎨 Turns your .scss directly into Lit CSS results
        uglify: !dev,
    }),
    
    // 2. Run the official TypeScript compiler on your code
    typescript({
        tsconfig: "./tsconfig.json",
    }),

    // 3. Standard resolution and bundling
    nodeResolve({
        browser: true,
    }),
    commonjs(),
    json(),
    babel({
        exclude: "node_modules/**",
    }),
    dev && serve(serveopts),
    !dev && terser(),
];

export default [
    {
        input: "src/kodi-playlist-card.ts",
        output: {
            dir: "dist",
            format: "es",
        },
        plugins: [...plugins],
    },
];