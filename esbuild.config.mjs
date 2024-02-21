import esbuild from 'esbuild';
import copy from 'esbuild-plugin-copy';
import process from 'process';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
	entryPoints: ['main.ts'],
	bundle: true,
	platform: 'node',
	target: 'es6',
	outfile: './build/main.js',
	plugins: [
		copy({
			assets: {
				from: ['./config.js'],
				to: ['./config.js'],
			},
		}),
	],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
