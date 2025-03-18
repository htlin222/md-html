import { useState, useEffect } from "react";

const MarkdownToHtmlEditor = () => {
	const [markdown, setMarkdown] = useState(
		'# Hello World\n\nThis is **bold** and this is *italic*.\n\nWelcome {username}! Your account balance is {balance}.\n\n- List item 1\n- List item 2\n\n[Link to Google](https://www.google.com)\n\n```javascript\nconsole.log("Hello World");\n```',
	);
	const [html, setHtml] = useState("");
	const [htmlForTextarea, setHtmlForTextarea] = useState("");
	const [copied, setCopied] = useState(false);
	const [placeholders, setPlaceholders] = useState<string[]>([]);
	const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

	// Helper function to escape HTML special characters
	const escapeHtml = (text: string): string => {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

	// Helper function to extract placeholders from text
	const extractPlaceholders = (text: string): string[] => {
		const matches = text.match(/\{([^{}]+)\}/g) || [];
		return matches.map(match => match.slice(1, -1));
	};

	// Helper function to copy placeholder
	const copyPlaceholder = (placeholder: string) => {
		navigator.clipboard.writeText(`content.${placeholder}`).then(
			() => {
				setCopiedPlaceholder(placeholder);
				setTimeout(() => setCopiedPlaceholder(null), 2000);
			},
			(err) => {
				console.error("Could not copy placeholder: ", err);
			},
		);
	};

	// Custom markdown parser
	const parseMarkdown = (text: string): string => {
		if (!text) return "";

		let result = text;

		// Handle PHP placeholders with {name} syntax
		result = result.replace(
			/\{([^{}]+)\}/g,
			'<span class="bg-yellow-100 text-red-600 px-1 rounded">&lt;?= $1 ?&gt;</span>',
		);

		// Handle code blocks with ```
		result = result.replace(
			/```(\w*)\n([\s\S]*?)\n```/g,
			function (_match: string, language: string, code: string) {
				return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
			},
		);

		// Handle inline code with `
		result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

		// Handle headers
		result = result.replace(/^# (.*$)/gm, "<h1>$1</h1>");
		result = result.replace(/^## (.*$)/gm, "<h2>$1</h2>");
		result = result.replace(/^### (.*$)/gm, "<h3>$1</h3>");
		result = result.replace(/^#### (.*$)/gm, "<h4>$1</h4>");
		result = result.replace(/^##### (.*$)/gm, "<h5>$1</h5>");
		result = result.replace(/^###### (.*$)/gm, "<h6>$1</h6>");

		// Handle bold
		result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
		result = result.replace(/__(.*?)__/g, "<strong>$1</strong>");

		// Handle italic
		result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");
		result = result.replace(/_(.*?)_/g, "<em>$1</em>");

		// Handle links
		result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

		// Handle unordered lists
		result = result.replace(/^\s*-\s*(.*$)/gm, "<li>$1</li>");
		result = result.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");

		// Handle ordered lists
		result = result.replace(/^\s*\d+\.\s*(.*$)/gm, "<li>$1</li>");
		result = result.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");

		// Handle paragraphs (needs to be after other transformations)
		// Split by line breaks and wrap non-empty lines that don't already have HTML tags
		const lines = result.split("\n");
		const wrappedLines = lines.map((line: string) => {
			// Skip lines that are empty or already have HTML tags
			if (line.trim() === "" || /<\/?[a-z][\s\S]*>/i.test(line)) {
				return line;
			}
			return `<p>${line}</p>`;
		});
		result = wrappedLines.join("\n");

		return result;
	};

	// Convert markdown to HTML for the textarea (with actual PHP tags)
	const createHtmlWithPhpTags = (text: string): string => {
		if (!text) return "";

		let result = text;

		// Handle PHP placeholders with {name} syntax - MUST COME FIRST
		result = result.replace(/\{([^{}]+)\}/g, "<?= $1 ?>");

		// Handle code blocks with ```
		result = result.replace(
			/```(\w*)\n([\s\S]*?)\n```/g,
			function (_match: string, language: string, code: string) {
				return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
			},
		);

		// Handle inline code with `
		result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

		// Handle headers
		result = result.replace(/^# (.*$)/gm, "<h1>$1</h1>");
		result = result.replace(/^## (.*$)/gm, "<h2>$1</h2>");
		result = result.replace(/^### (.*$)/gm, "<h3>$1</h3>");
		result = result.replace(/^#### (.*$)/gm, "<h4>$1</h4>");
		result = result.replace(/^##### (.*$)/gm, "<h5>$1</h5>");
		result = result.replace(/^###### (.*$)/gm, "<h6>$1</h6>");

		// Handle bold
		result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
		result = result.replace(/__(.*?)__/g, "<strong>$1</strong>");

		// Handle italic
		result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");
		result = result.replace(/_(.*?)_/g, "<em>$1</em>");

		// Handle links
		result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

		// Handle unordered lists
		result = result.replace(/^\s*-\s*(.*$)/gm, "<li>$1</li>");
		result = result.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");

		// Handle ordered lists
		result = result.replace(/^\s*\d+\.\s*(.*$)/gm, "<li>$1</li>");
		result = result.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");

		// Handle paragraphs
		const lines = result.split("\n");
		const wrappedLines = lines.map((line: string) => {
			// Skip lines that are empty or already have HTML tags
			if (line.trim() === "" || /<\/?[a-z][\s\S]*>/i.test(line)) {
				return line;
			}
			return `<p>${line}</p>`;
		});
		result = wrappedLines.join("\n");

		return result;
	};

	// Convert markdown to HTML when markdown changes
	useEffect(() => {
		try {
			// Parse markdown to get preview HTML with styled PHP placeholders
			const previewHtml = parseMarkdown(markdown);
			setHtml(previewHtml);

			// Create HTML with actual PHP tags for the textarea
			const htmlWithPhpTags = createHtmlWithPhpTags(markdown);
			setHtmlForTextarea(htmlWithPhpTags);

			// Extract and set placeholders
			const extractedPlaceholders = extractPlaceholders(markdown);
			setPlaceholders([...new Set(extractedPlaceholders)]);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			setHtml(
				`<p class="text-red-500">Error parsing markdown: ${errorMessage}</p>`,
			);
			setHtmlForTextarea(
				`<p class="text-red-500">Error parsing markdown: ${errorMessage}</p>`,
			);
		}
	}, [markdown]);

	// Handle copy HTML to clipboard
	const copyToClipboard = () => {
		navigator.clipboard.writeText(htmlForTextarea).then(
			() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			},
			(err) => {
				console.error("Could not copy text: ", err);
			},
		);
	};

	return (
		<div className="flex flex-col w-full h-full space-y-4">
			<h1 className="text-2xl font-bold">Markdown to HTML Editor</h1> 
			<a className="text-sm ml-2 text-blue-500" href="https://docs.google.com/spreadsheets/d/1NKRiLPrgnS3wv0WNXUpwyYW-C8JDVR_Z8VGQsKMsAzo/edit?gid=0" target="_blank">Google Sheets Link</a>
			

			{/* Placeholders section */}
			{placeholders.length > 0 && (
				<div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded">
					<span className="text-sm font-medium text-gray-700 pt-1">Valid Placeholders:</span>
					{placeholders.map((placeholder) => (
						<button
							key={placeholder}
							onClick={() => copyPlaceholder(placeholder)}
							className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							{`${placeholder}`}
							{copiedPlaceholder === placeholder && (
								<span className="ml-2 text-green-600">✓</span>
							)}
						</button>
					))}
				</div>
			)}

			<div className="flex flex-col md:flex-row w-full h-full gap-4">
				{/* Markdown input */}
				<div className="flex flex-col w-full md:w-1/2 h-full">
					<div className="bg-gray-100 px-4 py-2 font-medium">Markdown</div>
					<textarea
						className="w-full h-64 p-4 border border-gray-300 font-mono text-sm resize-none"
						value={markdown}
						onChange={(e) => setMarkdown(e.target.value)}
						placeholder="Enter markdown here..."
					/>
				</div>

				{/* HTML output */}
				<div className="flex flex-col w-full md:w-1/2 h-full">
					<div className="bg-gray-100 px-4 py-2 font-medium">HTML</div>
					<textarea
						className="w-full h-64 p-4 border border-gray-300 font-mono text-sm resize-none"
						value={htmlForTextarea}
						readOnly
						placeholder="HTML will appear here..."
					/>
				</div>
			</div>

			{/* Preview section */}
			<div className="w-full">
				<div className="bg-gray-100 px-4 py-2 font-medium">Preview</div>
				<div
					className="w-full p-4 border border-gray-300 min-h-32"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>

			{/* Copy button */}
			<button
				className={`px-4 py-2 rounded font-medium ${
					copied
						? "bg-green-500 text-white"
						: "bg-blue-500 text-white hover:bg-blue-600"
				}`}
				onClick={copyToClipboard}
			>
				{copied ? "Copied!" : "Copy HTML"}
			</button>
		</div>
	);
};

export default MarkdownToHtmlEditor;
