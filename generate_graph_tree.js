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

	// Configuration for spacing and layout
	let mermaid = `---\nconfig:\n  layout: elk\n  elk:\n    direction: RIGHT\n    nodePlacementStrategy: BRANDES_KOEPF\n    spacing.nodeNode: 100\n    spacing.componentComponent: 150\n---\ngraph LR\n`;

	// High-visibility Node Styles
	mermaid += `
    classDef screen fill:#f9f,stroke:#333,stroke-width:3px;
    classDef hook fill:#bbf,stroke:#333,stroke-width:2px;
    classDef service fill:#bfb,stroke:#333,stroke-width:2px;
    classDef utils fill:#fff,stroke:#333,stroke-dasharray: 5 5;
    \n`;

	const sanitize = (name) => name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
	const groups = {};
	const ignoredFolders = ['constants', 'node_modules', 'App'];

	// Track links for custom styling
	let linkCounter = 0;
	const linkStyles = [];

	const filteredFiles = Object.keys(tree).filter(file => {
		const dirName = path.dirname(file);
		const isIgnoredFolder = ignoredFolders.some(folder => file.startsWith(folder));
		const isConfig = file.includes('.config') || file.includes('tsconfig');
		const isRootFile = dirName === '.' || dirName === '';
		return !isIgnoredFolder && !isConfig && !isRootFile;
	});

	filteredFiles.forEach(file => {
		const id = sanitize(file);
		const label = file.replace(/\.[^/.]+$/, "");
		let entry = `    ${id}["${label}"]`;

		if (file.includes('app/')) entry += `:::screen`;
		else if (file.includes('hooks/')) entry += `:::hook`;
		else if (file.includes('services/')) entry += `:::service`;
		else if (file.includes('utils/')) entry += `:::utils`;

		const dirName = path.dirname(file);
		if (!groups[dirName]) groups[dirName] = [];
		groups[dirName].push(entry);
	});

	// Generate subgraphs dynamically based on discovered folder structure
	for (const [groupPath, nodes] of Object.entries(groups)) {
		const groupName = groupPath.replace(/[^a-zA-Z0-9]/g, "_");
		mermaid += `  subgraph ${groupName} ["${groupPath}"]\n${nodes.join('\n')}\n  end\n`;
	}

	/**
	 * RELATIONSHIPS WITH BOLD COLORED ARROWS
	 */
	filteredFiles.forEach(file => {
		const sourceId = sanitize(file);
		tree[file].forEach(dep => {
			if (filteredFiles.includes(dep)) {
				const targetId = sanitize(dep);
				mermaid += `    ${sourceId} --> ${targetId}\n`;

				// We increase stroke-width to 3px for maximum visibility
				if (dep.includes('services/')) {
					linkStyles.push(`linkStyle ${linkCounter} stroke:#2ecc71,stroke-width:3px`); // Bold Green
				} else if (dep.includes('hooks/')) {
					linkStyles.push(`linkStyle ${linkCounter} stroke:#3498db,stroke-width:3px`); // Bold Blue
				} else if (dep.includes('app/')) {
					linkStyles.push(`linkStyle ${linkCounter} stroke:#e67e22,stroke-width:3px`); // Bold Orange
				} else {
					linkStyles.push(`linkStyle ${linkCounter} stroke:#999,stroke-width:2px`);    // Standard Gray
				}

				linkCounter++;
			}
		});
	});

	mermaid += `\n    ${linkStyles.join('\n    ')}`;

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
