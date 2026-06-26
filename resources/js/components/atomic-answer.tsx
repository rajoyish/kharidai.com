import React from 'react';

interface AtomicAnswerProps {
    question: string;
    answer: string;
    headingLevel?: 'h2' | 'h3';
}

export function AtomicAnswer({ question, answer, headingLevel = 'h2' }: AtomicAnswerProps) {
    const Heading = headingLevel;

    return (
        <div className="my-8">
            <Heading className="text-xl font-semibold text-foreground mb-2">
                {question}
            </Heading>
            {/* The answer is strictly a single <p> tag with 40-60 words to optimize for Generative AI Answers */}
            <p className="text-muted-foreground leading-relaxed">
                {answer}
            </p>
        </div>
    );
}
