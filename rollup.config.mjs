import terser from '@rollup/plugin-terser';

export default {
    input: 'src/onscan.js',
    output: [
        {
            file: 'dist/onscan.esm.js',
            format: 'es',
        },
        {
            file: 'dist/onscan.cjs.js',
            format: 'cjs',
            exports: 'default',
        },
        {
            file: 'dist/onscan.umd.js',
            format: 'umd',
            name: 'onScan',
            exports: 'default',
        },
        {
            file: 'dist/onscan.umd.min.js',
            format: 'umd',
            name: 'onScan',
            exports: 'default',
            plugins: [terser()],
        },
    ],
};
