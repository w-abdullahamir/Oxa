const madge = require('madge');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Prepare output directory for graph artifacts
const outputDir = path.join('assets', 'graph');
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Dependency analysis settings
const config = {
	tsConfig: './tsconfig.json',
	fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
	excludeRegExp: [/node_modules/, /\.d\.ts$/],
	baseDir: '.'
};

madge('./', config).then((res) => {
	const tree = res.obj();

	// Initialize Mermaid syntax with ELK layout for cleaner edge routing
	let mermaid = `---\nconfig:\n  layout: elk\n---\ngraph TD\n`;

	// Helper to turn file paths into valid Mermaid node IDs
	const sanitize = (name) => name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");

	const groups = {};

	// Map files to their respective folders for subgraph grouping
	Object.keys(tree).forEach(file => {
		const id = sanitize(file);
		const label = file.replace(/\.[^/.]+$/, "");
		const entry = `    ${id}["${label}"]`;

		const dirName = path.dirname(file);
		const groupKey = (dirName === '.' || dirName === '') ? 'ProjectRoot' : dirName;

		if (!groups[groupKey]) groups[groupKey] = [];
		groups[groupKey].push(entry);
	});

	// Generate subgraphs dynamically based on discovered folder structure
	for (const [groupPath, nodes] of Object.entries(groups)) {
		const groupName = groupPath.replace(/[^a-zA-Z0-9]/g, "_");
		mermaid += `  subgraph ${groupName} ["${groupPath}"]\n${nodes.join('\n')}\n  end\n`;
	}

	// Convert dependency tree into Mermaid connection arrows
	Object.keys(tree).forEach(file => {
		const sourceId = sanitize(file);
		tree[file].forEach(dep => {
			const targetId = sanitize(dep);
			mermaid += `    ${sourceId} --> ${targetId}\n`;
		});
	});

	const mmdPath = path.join(outputDir, 'architecture.mmd');
	const svgPath = path.join(outputDir, 'architecture.svg');

	// Persist the Mermaid source text
	fs.writeFileSync(mmdPath, mermaid);
	console.log(`✅ architecture.mmd generated in ${outputDir}`);

	// Trigger Mermaid CLI to render the SVG file
	try {
		console.log('🎨 Generating SVG diagram...');
		execSync(`npx mmdc -i "${mmdPath}" -o "${svgPath}" -b white`);
		console.log(`🚀 Success! architecture.svg is ready in ${outputDir}`);
	} catch (error) {
		console.error('❌ Failed to generate SVG. Make sure @mermaid-js/mermaid-cli is installed.');
		console.error(error.message);
	}
});
