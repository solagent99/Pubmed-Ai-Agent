import { Character, elizaLogger, ModelProviderName, Clients } from '@elizaos/core';
import { z } from 'zod';

const MainCharacterSchema = z.object({
    id: z.string().min(1, "Character ID is required"),
    name: z.string().min(1, "Character name is required"),
    modelProvider: z.string().transform((val): ModelProviderName => {
        if (val !== 'openai') {
            throw new Error("Model provider must be 'openai'");
        }
        return val as ModelProviderName;
    }),
    bio: z.array(z.string()),
    style: z.object({
        all: z.array(z.string()),
        chat: z.array(z.string()),
        post: z.array(z.string())
    }),
    lore: z.array(z.string()),
    messageExamples: z.array(z.array(z.object({
        user: z.string(),
        content: z.object({
            text: z.string()
        })
    }))),
    postExamples: z.array(z.string()),
    topics: z.array(z.string()),
    adjectives: z.array(z.string()),
    knowledge: z.array(z.string()),
    clients: z.array(z.string().transform((val): Clients => {
        if (val !== 'twitter') {
            throw new Error("Client must be 'twitter'");
        }
        return val as Clients;
    })),
    plugins: z.array(z.string()),
    settings: z.object({
        secrets: z.object({}).transform(obj => obj as Record<string, string>),
        model: z.string(),
        embeddingModel: z.string()
    })
});

let mainCharacter: Character | null = null;

export function setMainCharacter(character: Character): void {
    try {
        const validatedCharacter = MainCharacterSchema.parse(character);
        mainCharacter = validatedCharacter;
        elizaLogger.info('Main character set:', { id: character.id, name: character.name });
    } catch (error) {
        elizaLogger.error('Failed to set main character:', error);
        throw error;
    }
}

export function getMainCharacter(): Character {
    if (!mainCharacter) {
        throw new Error('Main character not set');
    }
    return mainCharacter;
}