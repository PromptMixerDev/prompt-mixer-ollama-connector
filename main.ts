import ollama from 'ollama';
import { config } from './config';
import * as fs from 'fs';

interface Message {
	role: string;
	content: string;
	images?: Uint8Array[] | string[];
}

interface Completion {
	Content: string | null;
	TokenUsage: number | undefined;
}

interface ConnectorResponse {
	Completions: Completion[];
	ModelType: string;
}

interface ChatCompletion {
	output: string;
	stats: { model: string };
}

const mapToResponse = (outputs: ChatCompletion[]): ConnectorResponse => {
	return {
		Completions: outputs.map((output) => ({
			Content: output.output,
			TokenUsage: undefined, // Token usage is not provided in the new API
		})),
		ModelType: outputs[0].stats.model,
	};
};

function extractImageUrls(prompt: string): string[] {
	const imageExtensions = ['.png', '.jpeg', '.jpg', '.webp', '.gif'];
	// Updated regex to match both http and local file paths
	const urlRegex =
		/(https?:\/\/[^\s]+|[a-zA-Z]:\\[^:<>"|?\n]*|\/[^:<>"|?\n]*)/g;
	const urls = prompt.match(urlRegex) || [];

	return urls.filter((url) => {
		const extensionIndex = url.lastIndexOf('.');
		if (extensionIndex === -1) {
			// If no extension found, return false.
			return false;
		}
		const extension = url.slice(extensionIndex);
		return imageExtensions.includes(extension.toLowerCase());
	});
}

function encodeImage(imagePath: string): string {
	const imageBuffer = fs.readFileSync(imagePath);
	return Buffer.from(imageBuffer).toString('base64');
}

async function main(
	model: string,
	prompts: string[],
	properties: Record<string, unknown>,
): Promise<ConnectorResponse> {
	const { prompt, ...restProperties } = properties;
	const systemPrompt = (prompt ||
		config.properties.find((prop) => prop.id === 'prompt')?.value) as string;

	const messageHistory: Message[] = [
		{
			role: 'system',
			content: systemPrompt,
			...restProperties,
		},
	];
	const outputs: ChatCompletion[] = [];

	try {
		for (const prompt of prompts) {
			const imageUrls = extractImageUrls(prompt);
			const base64Images = imageUrls.map((imagePath) => encodeImage(imagePath));
			messageHistory.push({
				role: 'user',
				content: prompt,
				images: base64Images,
			});

			const response = await ollama.chat({
				model: model,
				messages: messageHistory,
			});

			const assistantResponse = response.message.content;
			messageHistory.push({ role: 'assistant', content: assistantResponse });

			outputs.push({ output: assistantResponse, stats: { model } });

			console.log(`Response to prompt: ${prompt}`, assistantResponse);
		}

		return mapToResponse(outputs);
	} catch (error) {
		console.error('Error in main function:', error);
		throw error;
	}
}

export { main, config };
