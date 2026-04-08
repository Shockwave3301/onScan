import terser from '@rollup/plugin-terser';

export default {
    input: 'src/onscan.js',
    output: [
        {
            file: 'dist/onscan.esm.js',
            format: 'es',
            sourcemap: true,
        },
        {
            file: 'dist/onscan.cjs.js',
            format: 'cjs',
            exports: 'default',
            sourcemap: true,
        },
        {
            file: 'dist/onscan.umd.js',
            format: 'umd',
            name: 'onScan',
            exports: 'default',
            sourcemap: true,
        },
        {
            file: 'dist/onscan.umd.min.js',
            format: 'umd',
            name: 'onScan',
            exports: 'default',
            sourcemap: true,
            plugins: [terser()],
        },
    ],
};
