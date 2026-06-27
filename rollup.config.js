import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import litCss from "rollup-plugin-lit-css";

const dev = process.env.ROLLUP_WATCH;

const plugins = [
    litCss({
        include: ["**/*.scss"],
        uglify: !dev,
    }),
    typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        sourceMap: false,
    }),
    nodeResolve({
        browser: true,
    }),
    commonjs(),
    json(),
    babel({
        exclude: "node_modules/**",
    }),
    !dev && terser(),
].filter(Boolean);

export default {
    input: "src/kodi-playlist-card.ts", 
    output: {
        file: "dist/kodi-playlist-card.js",  
        format: "es",
        sourcemap: false,
    },
    plugins: plugins,
};